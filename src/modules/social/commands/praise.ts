import { Client } from "../../../client/client";

import { Praise as DatabasePraise } from '../../../database/structs/praise';

import { Moderation } from "../../moderation/moderation";
import { Social } from "../social";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import config from '../../../config.json';
import moment from "moment";

export class Praise extends Command<Social> {
  readonly identifier = 'praise';
  readonly aliases = ['thank', 'acknowledge'];
  readonly description = 'Praises a user for their contribution/s. ' + 
    `This command can only be used once every ${Utils.pluralise('hour', config.thankCooldownInHours)}.`;
  readonly parameters = ['user', 'optional: for'];
  readonly dependencies = [];
  readonly handler = this.thank;

  async thank({message, parameters}: HandlingData) {
    const caster = await Client.database.fetchOrCreateDocument(message.author);
    
    const member = await Moderation.resolveMember(message, parameters.get('user')!);

    if (member === undefined) return;

    const target = await Client.database.fetchOrCreateDocument(member.user);

    if (member.user.bot) {
      Client.warn(message.channel, 
        `A bot cannot be praised. Their programmer *can* be praised, though.  😜`
      );
      return;
    }

    if (message.author.id === member.id) {
      Client.warn(message.channel, 
        `A user cannot praise themselves. I'm sure a narcissist will be able to find a way, though.  😜`
      );
      return;
    }

    const now = moment();
    const cannotPraiseUntil = caster.user.cannotPraiseUntil;

    if (!!cannotPraiseUntil && !cannotPraiseUntil.isBefore(now)) {
      Client.warn(message.channel,
        `You have already recently praised a member. ` +
        `You will be able to praise another member again ${cannotPraiseUntil.fromNow()}.`
      );
      return;
    }

    message?.delete({timeout: config.messageAutodeleteInSeconds * 1000});

    caster.user.cannotPraiseUntil = now.add(config.thankCooldownInHours, 'hours');

    const praise = new DatabasePraise({author: caster.user.id, for: parameters.get('for')});

    target.user.praises.push(praise);

    let praiseMessage = 
      `${Utils.toUserTag(member.id)} has been praised by ${Utils.toUserTag(message.author.id)}!  🎉\n\n` +
      Social.displayNumberOfPraises(target);

    if (target.user.praises.length === 1) {
      praiseMessage += Social.displayEmojiInstructions();
    }

    Client.info(message.channel, praiseMessage).then((message) => {
      message?.delete({timeout: config.messageAutodeleteInSeconds * 1000});
    });

    Social.assignEmoji(target, member);

    // TODO: This probability should probably be determined by something else, such as trust level
    // or the amount of thanks the caster already has
    if (Utils.roll(0.1)) {
      const praise = new DatabasePraise({author: Client.bot.id, for: 'Social interaction'});

      caster.user.praises.push(praise);

      Client.info(message.channel, 
        `BONUS! ${Utils.toUserTag(message.author.id)} has also been praised for social interaction!  🎉\n\n` +
        Social.displayNumberOfPraises(caster)
      ).then((message) => {
        message?.delete({timeout: config.messageAutodeleteInSeconds * 1000});
      });

      Social.assignEmoji(caster, member);
    }

    await Client.database.update(caster);
    await Client.database.update(target);
  }
}