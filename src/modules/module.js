import { areSimilar } from "../language.js";

export class TeacherModule {
    static resolveCommand(message, commands) {
        // Split the message into arguments
        let firstArgument = message.shift();

        if (firstArgument === undefined) {
            return;
        }

        commands.forEach((trigger, result) => {
            if (areSimilar(trigger, firstArgument)) {
                return result.call();
            }
        });
    }
}