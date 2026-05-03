import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Analysis from "./pages/Analysis";
import Markets from "./pages/Markets";
import Education from "./pages/Education";
import EducationArticle from "./pages/EducationArticle";
import Tutorials from "./pages/Tutorials";
import TutorialArticle from "./pages/TutorialArticle";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="markets" element={<Markets />} />
        <Route path="education" element={<Education />} />
        <Route path="education/:slug" element={<EducationArticle />} />
        <Route path="tutorials" element={<Tutorials />} />
        <Route path="tutorials/:slug" element={<TutorialArticle />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="account" element={<Account />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
