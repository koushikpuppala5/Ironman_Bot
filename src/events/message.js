const { MessageEmbed } = require('discord.js');
const { oneLine } = require('common-tags');

module.exports = (client, message) => {
    if (message.channel.type === 'dm' || !message.channel.viewable || message.author.bot) return;

    // Get disabled commands
    let disabledCommands = client.db.settings.selectDisabledCommands.pluck().get(message.guild.id) || [];
    if (typeof(disabledCommands) === 'string') disabledCommands = disabledCommands.split(' ');

    // Get points
    const { point_tracking: pointTracking, message_points: messagePoints, command_points: commandPoints } =
    client.db.settings.selectPoints.get(message.guild.id);

    // Command handler
    const prefix = client.db.settings.selectPrefix.pluck().get(message.guild.id);
    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*`);

    if (prefixRegex.test(message.content)) {

        // Get mod channels
        let modChannelIds = message.client.db.settings.selectModChannelIds.pluck().get(message.guild.id) || [];
        if (typeof(modChannelIds) === 'string') modChannelIds = modChannelIds.split(' ');

        const [, match] = message.content.match(prefixRegex);
        const args = message.content.slice(match.length).trim().split(/ +/g);
        const cmd = args.shift().toLowerCase();
        let command = client.commands.get(cmd) || client.aliases.get(cmd); // If command not found, check aliases
        if (command && !disabledCommands.includes(command.name)) {

            // Check if mod channel
            if (modChannelIds.includes(message.channel.id)) {
                if (
                    command.type != client.types.MOD || (command.type == client.types.MOD &&
                        message.channel.permissionsFor(message.author).missing(command.userPermissions) != 0)
                ) {
                    // Update points with messagePoints value
                    if (pointTracking)
                        client.db.users.updatePoints.run({ points: messagePoints }, message.author.id, message.guild.id);
                    return; // Return early so Calypso doesn't respond
                }
            }

            // Check permissions
            const permission = command.checkPermissions(message);
            if (permission) {

                // Update points with commandPoints value
                if (pointTracking)
                    client.db.users.updatePoints.run({ points: commandPoints }, message.author.id, message.guild.id);
                message.command = true; // Add flag for messageUpdate event
                return command.run(message, args); // Run command
            }
        } else if (
            (message.content === `<@${client.user.id}>` || message.content === `<@!${client.user.id}>`) &&
            message.channel.permissionsFor(message.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS']) &&
            !modChannelIds.includes(message.channel.id)
        ) {
            const embed = new MessageEmbed()
                .setTitle('Hi, I\'m Iron man. Need help?')
                .setThumbnail('https://github.com/koushikpuppala5/Avenger_Bot_Star/blob/masters/data/images/All.png')
                .setDescription(`You can see everything I can do by using the \`${prefix}help\` command.`)
                .addField('Invite Me', oneLine `
          You can add me to your server by clicking 
          [here](https://discord.com/oauth2/authorize?client_id=757514337475756053&scope=bot&permissions=470248574)!`)
                .addField('Support', oneLine `
                        If you have questions, suggestions, or found a bug, please join the[Ironman's Support Server](https://discord.gg/SgCABjZ3cy)!`)
                .setFooter('DM 🌠┊𝑃𝑜𝑤𝑒𝑟𝑠𝑡𝑎𝑟™#4121 to speak directly with the developer!')
                .setColor(message.guild.me.displayHexColor);
            message.channel.send(embed);
        }
    }

    // Update points with messagePoints value
    if (pointTracking) client.db.users.updatePoints.run({ points: messagePoints }, message.author.id, message.guild.id);
};