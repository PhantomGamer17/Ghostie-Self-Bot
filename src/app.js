const Commando = require('discord.js-commando');
const Discord = require("discord.js");
const auth = require("./auth.json");
const path = require('path');
const oneLine = require('common-tags').oneLine;
const sqlite = require('sqlite');
const moment = require('moment');
const messageStoreChannelID = auth.storeChannel;
const ownerID = auth.ownerID;
const client = new Commando.Client({
    owner: auth.ownerID,
    commandPrefix: '\\',
    selfbot: true
});
var messageStore = [];

client
    .on('ready', () => {
        console.log(`Client ready; logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`);
    })
    .on('commandPrefixChange', (guild, prefix) => {
        console.log(oneLine `
			Prefix ${prefix === '' ? 'removed' : `changed to ${prefix || 'the default'}`}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
    })
    .on('error', console.error)
    .on('warn', console.warn)
    .on('debug', console.log)
    .on('disconnect', () => {
        console.warn('Disconnected!');
    })
    .on('reconnecting', () => {
        console.warn('Reconnecting...');
    })
    .on('commandError', (cmd, err) => {
        if (err instanceof Commando.FriendlyError) return;
        console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
    })
    .on('commandBlocked', (msg, reason) => {
        console.log(oneLine `
		Command ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''}
		blocked; ${reason}
	`);
    })
    .on('commandStatusChange', (guild, command, enabled) => {
        console.log(oneLine `
		Command ${command.groupID}:${command.memberName}
		${enabled ? 'enabled' : 'disabled'}
		${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
	`);
    })
    .on('groupStatusChange', (guild, group, enabled) => {
        console.log(oneLine `
		Group ${group.id}
		${enabled ? 'enabled' : 'disabled'}
		${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
	`);
    });


client.setProvider(
    sqlite.open(path.join(__dirname, 'settings.sqlite3')).then(db => new Commando.SQLiteProvider(db))
).catch(console.error);

client.registry
    .registerGroups([
        ['store', 'Message Store commands'],
        ['search', 'Web Search commands'],
        ['links', 'Quick Website Links'],
        ['reactions', 'Image Reactions'],
        ['info', 'Discord Info'],
        ['misc', 'Miscellanious commands'],
        ['nsfw', 'NSFW finding commands']
    ])
    .registerDefaultGroups()
    .registerDefaultTypes()
    .registerDefaultCommands({
        help: true,
        prefix: true,
        ping: true,
        eval_: true,
        commandState: false
    })
    .registerCommandsIn(path.join(__dirname, 'commands'));

client.login(auth.token);

client.on("message", msg => {
    if (msg.author.id === ownerID && msg.channel.id !== messageStoreChannelID) {
        const content = msg.content.toLowerCase();
        const args = msg.content.split(' ').slice(1);
        const storeChannel = client.channels.get(messageStoreChannelID);
        let prefix = msg.guild.commandPrefix;

        let currentStoreSize = messageStore.length;
        if (currentStoreSize === 10) {
            messageStore.pop();
            for (let ID in messageStore) {
                messageStore[ID].id = messageStore[ID].id + 1
            }
            messageStore.unshift({
                id: 1,
                message: msg
            });
        } else {
            for (let ID in messageStore) {
                messageStore[ID].id = messageStore[ID].id + 1
            }
            messageStore.unshift({
                id: 1,
                message: msg
            });
        };

        if (content.startsWith(prefix + "edit")) {
            messageStore.shift();
            msg.delete();

            let indicator = args.slice(0, 1).toString();
            let newContent = args.slice(1).join(' ');
            if (!indicator.match(/[0-9]+/)) {
                return client.channels.get(messageStoreChannelID).send(`You forgot an indicator ID\nContent of message: ${msg.content}\nTime of command: ${moment(new Date).format('MMMM Do YYYY | HH:mm:ss')}`);
            };
            messageStore[indicator.toString()].message.edit(newContent);
        };

        if (content.startsWith(prefix + "delete")) {
            messageStore.shift();
            msg.delete();

            let indicator = args.slice(0, 1).toString();
            if (!indicator.match(/[0-9]+/)) {
                return client.channels.get(messageStoreChannelID).send(`You forgot an indicator ID\nContent of message: ${msg.content}\nTime of command: ${moment(new Date).format('MMMM Do YYYY | HH:mm:ss')}`);
            };
            messageStore[indicator].message.delete();
        };

        if (content.startsWith(prefix + "clear")) {
            msg.delete();
            messageStore = [];
        };

        if (content.startsWith(prefix + "check")) {
            messageStore.shift();
            msg.delete();

            let storeEmbed = new Discord.RichEmbed();

            storeEmbed.setColor('#FF0000');
            storeEmbed.setFooter(`Store log from ${moment(new Date).format('MMMM Do YYYY | HH:mm:ss')}`);
            messageStore.length === 0 ? storeEmbed.addField('Location in store', '0', true) : storeEmbed.addField('Location in store', positionFormatter(messageStore.length), true);
            messageStore.length === 0 ? storeEmbed.addField('Content of message', 'none', true) : storeEmbed.addField('Content of message', messageStore.map(mcont => mcont.message.content), true);
            storeChannel.send({
                embed: storeEmbed
            });
        };
    }
});

function positionFormatter(length) {
    let numbers = [];
    for (let i = 0; i < length; i++) {
        numbers.push(i)
    }
    return numbers;
};