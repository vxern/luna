import { TeacherClient } from './teacher/teacher.js';

const Teacher = new TeacherClient();

async function main() {
    await Teacher.login();
}

main().catch((error) => console.error(error));