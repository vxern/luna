import { Client } from './client/client';

async function main() {
  /// Array of environment variables required to run the program
  const requiredEnv = ['DISCORD_SECRET', 'FAUNA_SECRET', 'YOUTUBE_SECRET'];
  /// Array of booleans indicating which environment variables are present at launch
  const presentEnv = requiredEnv.map((env) => env in process.env);
  
  // If at least one environment variable is not present
  if (presentEnv.includes(false)) {
    const missingEnv = presentEnv.filter((env: boolean) => !env).map((_, index) => requiredEnv[index]);
    console.error(`Missing one or more required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }

  const client: Client = new Client();
  
  await client.initialise();
}

main().catch((error) => console.error(error));