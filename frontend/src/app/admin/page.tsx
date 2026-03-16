import { DocList } from '../../components/admin/DocList'
import { Stats } from '../../components/admin/Stats'

export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <Stats />
      <DocList />
    </div>
  )
}
