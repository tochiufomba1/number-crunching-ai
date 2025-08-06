import { auth } from "@/../auth"
import Card from "@/app/ui/components/card"
import PersonalTemplateForm from "@/app/ui/dashboard/personal-templates"
import TemplateForm from "@/app/ui/dashboard/template-form"

export default async function Page() {
  const session = await auth()

  if (!session?.user) return <p>Couldn&apos;t load your data...</p>

  const user = { id: session.user.id as string, username: session.user.name as string }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Card title="Create Template">
        <TemplateForm user={user} />
      </Card>
      <Card title="My Templates">
        <PersonalTemplateForm user={user} />
      </Card>
    </div>
  )
}