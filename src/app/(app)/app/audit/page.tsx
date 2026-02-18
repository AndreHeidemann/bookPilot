import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/service";
import { getAuditLogs } from "@/server/audit/service";

const AuditPage = async () => {
  const user = await getCurrentUser();
  const logs = await getAuditLogs(user.teamId, 25);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">Latest changes across your team workspace.</p>
      </div>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                <td className="px-4 py-3 text-slate-600">{log.actor?.email ?? "System"}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default AuditPage;
