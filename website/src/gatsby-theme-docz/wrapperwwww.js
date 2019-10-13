  import React from "react";
import { BrowserRouter } from "react-router-dom";

export default ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};