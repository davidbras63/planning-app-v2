import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getSettings } from "@/app/actions/settingsActions";
import SettingsView from "@/components/SettingsView";

export default async function SettingsPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const data = await getSettings(userId);

  return <SettingsView initialData={data} userId={userId} />;
}