import { HashRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./login";
import PrintInboxHub from "./PrintInboxHub_DarkMode";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<PrintInboxHub />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
