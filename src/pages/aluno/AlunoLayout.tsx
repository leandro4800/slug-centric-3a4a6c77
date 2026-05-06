import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const AlunoLayout = () => (
  <div className="min-h-screen bg-transparent pb-24">
    <Outlet />
    <BottomNav />
  </div>
);

export default AlunoLayout;
