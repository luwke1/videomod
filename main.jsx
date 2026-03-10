import React from "react";
import ReactDOM from "react-dom/client";
// Update these two lines to look into the 'src' folder
import App from "./src/App.jsx"; 
import "./src/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);