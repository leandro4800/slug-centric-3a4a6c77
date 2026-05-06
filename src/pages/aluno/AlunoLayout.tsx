import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import BackHandler from "@/components/BackHandler";

const AlunoLayout = () => (
  <div className="min-h-screen bg-transparent pb-24">
    <BackHandler />
    <Outlet />
    <BottomNav />
  </div>
);

export default AlunoLayout;
