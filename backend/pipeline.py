import sys, os, subprocess, argparse, cv2, torch, time, shutil
import numpy as np
from depth_anything_3.api import DepthAnything3
from pathlib import Path

# Force Xformers/Triton off for Windows stability
os.environ["XFORMERS_FORCE_DISABLE_TRITON"] = "1"

BASE_DIR = Path(__file__).parent.parent.resolve()
FFMPEG_PATH = BASE_DIR / "dependencies" / "ffmpeg" / "bin" / "ffmpeg.exe"
FFMPEG_BIN = str(FFMPEG_PATH) if FFMPEG_PATH.exists() else "ffmpeg"

def process_video(video_path, start_time, end_time, use_cuda, output_dir):
    print("STATUS:STARTING_VOLUMETRIC_PIPELINE...", flush=True)
    
    output_dir = Path(output_dir).resolve()
    if not output_dir.exists(): output_dir.mkdir(parents=True)

    temp_frames_dir = output_dir / "temp_depth_frames"
    if temp_frames_dir.exists(): shutil.rmtree(temp_frames_dir)
    temp_frames_dir.mkdir()

    trimmed_video = output_dir / "trimmed.mp4"
    web_depth_video = output_dir / "depth_web.mp4"

    print("STATUS:PROBING_NATIVE_FRAMERATE...", flush=True)
    # 1. Pre-Probe the source video for its native FPS
    temp_cap = cv2.VideoCapture(str(video_path))
    original_fps = temp_cap.get(cv2.CAP_PROP_FPS)
    temp_cap.release()

    # Safety fallback in case the header is completely missing
    if original_fps == 0 or np.isnan(original_fps): 
        original_fps = 30.0

    # Cap the target FPS to 30
    target_fps = min(original_fps, 30.0)
    
    print(f"STATUS:TRIMMING_VIDEO_AT_{target_fps:.2f}_FPS...", flush=True)
    # 3. Inject the dynamic target_fps to enforce CFR without destroying stop-motion
    subprocess.run([
        FFMPEG_BIN, "-y", "-i", str(video_path), 
        "-ss", str(start_time), "-to", str(end_time), 
        "-r", str(target_fps), 
        "-c:v", "libx264", "-crf", "10", str(trimmed_video)
    ], check=True, capture_output=True)

    print("STATUS:LOADING_DA3_LARGE...", flush=True)
    device = torch.device("cuda" if use_cuda and torch.cuda.is_available() else "cpu")
    
    try:
        model = DepthAnything3.from_pretrained("depth-anything/DA3-LARGE").to(device)
        
        cap = cv2.VideoCapture(str(trimmed_video))
        
        # 4. Read the confirmed FPS from the trimmed file for downstream stitching
        actual_fps = cap.get(cv2.CAP_PROP_FPS)
        if actual_fps == 0: actual_fps = target_fps

        print(f"STATUS:EXTRACTING_DEPTH_FRAMES_AT_{actual_fps:.2f}_FPS...", flush=True)
        
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            frame_count += 1
            if frame_count % 20 == 0:
                print(f"STATUS:PROCESSING_FRAME_{frame_count}/{total_frames}...", flush=True)
            
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            prediction = model.inference([rgb_frame])
            depth = prediction.depth[0] 

            # Force the squished DA3 depth map back to the exact RGB dimensions
            depth = cv2.resize(depth, (width, height), interpolation=cv2.INTER_LINEAR)

            depth_normalized = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
            depth_uint8 = (depth_normalized * 255).astype(np.uint8)
            
            frame_name = f"frame_{frame_count:06d}.png"
            cv2.imwrite(str(temp_frames_dir / frame_name), depth_uint8)
            
        cap.release()
        
        print("STATUS:STITCHING_DEPTH_VIDEO...", flush=True)
        result = subprocess.run([
            FFMPEG_BIN, "-y", 
            "-framerate", str(actual_fps), 
            "-i", str(temp_frames_dir / "frame_%06d.png"), 
            "-c:v", "libx264", 
            "-pix_fmt", "yuv420p", 
            "-crf", "10", 
            str(web_depth_video)
        ], capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"FFmpeg failed: {result.stderr}")

        shutil.rmtree(temp_frames_dir)

        # --- NEW CODE: STACK RGB AND DEPTH VERTICALLY ---
        combined_video = output_dir / "combined.mp4"
        print("STATUS:PACKING_TEXTURES_INTO_SINGLE_STREAM...", flush=True)
        
        stack_result = subprocess.run([
            FFMPEG_BIN, "-y", 
            "-i", str(trimmed_video), 
            "-i", str(web_depth_video), 
            "-filter_complex", "vstack", 
            "-c:v", "libx264", 
            "-crf", "10", 
            str(combined_video)
        ], capture_output=True, text=True)

        if stack_result.returncode != 0:
            raise Exception(f"FFmpeg stacking failed: {stack_result.stderr}")

        print(f"RESULT:{str(output_dir)}", flush=True)

    except Exception as e:
        print(f"LOG:ERROR:{str(e)}", flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video")
    parser.add_argument("--start", type=float)
    parser.add_argument("--end", type=float)
    parser.add_argument("--cuda", type=str)
    parser.add_argument("--out")
    args = parser.parse_args()
    process_video(args.video, args.start, args.end, args.cuda.lower() == "true", args.out)