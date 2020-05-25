require("dotenv").config()
const Discord = require("discord.js")
const client = new Discord.Client()
const axios = require('axios')
const mongoose = require('mongoose')
const variableModel = require('./models/variable')
let cache = { variables: [] }

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`)

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_CONN_STRING, {
        useNewUrlParser: true
    }).catch((err) => console.log(err))

    // Load current user variables into the cache
    await variableModel.find({})
        .then(data => {
            cache.variables = data
        })
        .catch((err) => console.log(err))
})

client.on("message",  async (message) => {
    const repeatCommand = '!again'
    const helpCommand = '!help'
    const variableRegex = /^\$[a-zA-Z]+[=][^=].*$/
    const getVariableRegex = /^\$[a-zA-Z]{1,20}$/

    if (message.member.user.bot) return

    // Get variable value
    if (getVariableRegex.test(message.content)) {
        let name = message.content.substring(1)
        let variable = cache.variables.find(v => v.name === name)

        if (!variable) return
        
        message.channel.send(`From ${message.member}: ${variable.value}`)
            .then(() => {
                message.delete()
            })
            .catch((err) => console.log(err))

        return
    }

    // Create new variable
    if (variableRegex.test(message.content)) {
        const maxNameLen = 20
        const maxValueLen = 100

        let equalIndex = message.content.indexOf('=')
        let _name = message.content.substring(1, equalIndex)
        let _value = message.content.substring(equalIndex + 1)

        let errorResponse = (text) => {
            message.reply(text)
            .then(msg => {
                msg.delete({ timeout: 3000 })
            })
            .catch((err) => console.log(err) )
        }

        if (_name.length > maxNameLen || _value.length > maxValueLen) {
            errorResponse(`Invalid variable length!`)
            return
        }

        if (cache.variables.find(v => v.name === _name) !== undefined) {
            errorResponse(`This variable already exists!`)
            return
        }

        const variable = new variableModel({
            name: _name,
            value: _value
        })

        variable.save()
            .then((data) => {
                cache.variables.push(data)
            })
            .catch((err) => console.log(err))

        return
    }

    // Repeat previous command
    if (message.content.toLowerCase() === repeatCommand) {
        const maxMessages = 20
        let lastCommand = await message.channel.messages.fetch({ limit: maxMessages })
            .then(channelMessages => {
                for (let msg of channelMessages.entries()) {
                    let mContent = msg[1] // get value of message key:value pair

                    if (mContent.content.toLowerCase() === repeatCommand) {
                        mContent.delete()
                            .catch(err => console.log(err))
                        continue
                    }

                    if (mContent.author.id === message.author.id) return mContent
                }
                message.reply(`Your last command is too far back!`)
            }).catch(() => {
                message.reply(`Unable to retrieve the last command`)
                    .catch((err) => console.log(err))
            })

        if (lastCommand) message = lastCommand
    }

    // Display bot features to user
    if (message.content.toLowerCase() === helpCommand) {
        let msg = 
        `1. Enter "bible verse" in a message to see a random Bible verse\n2. !avatar @user will reply with a link to the user's avatar\n3. !again will repeat the last command\n4. $name=value will create a new variable (name) with value (value)\n5. $name will display the value within the (name) variable`

        message.channel.send(msg)
            .catch((err) => console.log(err))
    }

    // Return Bible random Bible verses
    // Credit to https://www.ourmanna.com/verses/api/ for the bible verse API
    else if (message.content.toLowerCase().includes('bible verse')) {
        const emojiBank = ['😇', '👊', '😄', '🙌', '❤️']
        const getEmoji = () => emojiBank[Math.floor(Math.random() * emojiBank.length)]

        message.react(getEmoji())
            .catch((err) => console.log(err))

        axios.get(`https://beta.ourmanna.com/api/v1/get/?format=json&order=random`)
        .then(res => {
            const data = res.data
            const verse = data.verse.details.text
            const reference = data.verse.details.reference
            
            message.reply(reference + ' says ' + verse)
                .catch((err) => console.log(err))
        })
        .catch(() => {
            message.reply('Unable to retrieve the verse 😢')
                .catch((err) => console.log(err))
        })
    }

    // Retrieve user avatar
    else if (message.content.startsWith("!avatar")) {
        let member = message.mentions.members.first()
        let user = member ? member.user : message.author

        message.channel.send(`${user.username}'s avatar: <${user.displayAvatarURL({ format: "png", dynamic: true })}>`)
            .catch(() => {
                message.channel.send('Unable to retrieve the avatar.')
                    .catch((err) => console.log(err))
            })
    }

    // Respond to bot mentions
    else if (message.mentions.has(client.user)) {
        const responses = ['What\'s up?', 'You talking to me?', 'Greetings, my friend!', 'Howdy!']
        const respond = () => responses[Math.floor(Math.random() * responses.length)]

        message.channel.send(respond())
            .catch((err) => console.log(err))
    }
})

client.login(process.env.BOT_TOKEN)