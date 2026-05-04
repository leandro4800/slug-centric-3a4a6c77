import { VlogsAdmin } from "@/components/admin/VlogsAdmin";
import { AdminBackButton } from "@/components/admin/AdminBackButton";

const AdminVlogs = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <AdminBackButton />
        <h1 className="font-display text-4xl text-primary mb-2 mt-4">VLOGS</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Publique novos episódios e configure a automação do seu canal.
        </p>
        <VlogsAdmin />
      </div>
    </div>
  );
};

export default AdminVlogs;
