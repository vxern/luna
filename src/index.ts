import { MynaClient } from './client/client';

const Client: MynaClient = new MynaClient();

const requiredEnv: Array<string> = ['DISCORD_SECRET', /*'FAUNA_SECRET', 'YOUTUBE_SECRET'*/];
const presentEnv: Array<boolean> = requiredEnv.map(value => value in process.env);

// If there is an environment variable not present
if (presentEnv.includes(false)) {
  let notPresent = (value: boolean) => !value;
  let notPresentEnv: Array<String> = presentEnv.filter(notPresent).map((_, index) => requiredEnv[index]);
  console.error(`Missing one or more required environment variables: ${notPresentEnv.join(', ')}`);
  process.exit(1);
}

async function main() {
  await Client.login();
}

main().catch((error) => console.error(error));