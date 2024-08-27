/**
 * @name Reminder
 * @version 1.0
 * @description A BetterDiscord plugin that allows users to create, view, and manage custom reminders with notification support.
 * @author DevEvil
 * @website https://devevil.com
 * @invite jsQ9UP7kCA
 * @authorId 468132563714703390
 * @donate https://oxapay.com/donate/76037572
 * @source https://github.com/DevEvil99/Reminder-BetterDiscord-Plugin
 * @updateUrl https://raw.githubusercontent.com/DevEvil99/Reminder-BetterDiscord-Plugin/main/Reminder.plugin.js
 */

const config = {
    info: {
        name: "Reminder",
        version: "1.0",
        description: "A BetterDiscord plugin that allows users to create, view, and manage custom reminders with notification support.",
        authors: [{
            name: "DevEvil",
            discord_id: "468132563714703390",
            github_username: "DevEvil99"
        }],
        website: "https://devevil.com",
        github: "https://github.com/DevEvil99/Reminder-BetterDiscord-Plugin",
        github_raw: "https://raw.githubusercontent.com/DevEvil99/Reminder-BetterDiscord-Plugin/main/Reminder.plugin.js",
        invite: "jsQ9UP7kCA",
    },
    changelog: [{
        title: "Version 1.0",
        type: "fixed",
        items: ["Fixed some bugs", "Added Plugin Library Check", "Improved some things", "Added settings panel"]
    }]
};

class Reminder {
    constructor() {
        this.defaultSettings = {
            notificationSound: true,
            reminderInterval: 1000
        };
        this.settings = this.loadSettings();
        this.reminders = this.loadReminders();
        this.checkInterval = null;
        this.audio = new Audio('https://www.myinstants.com/media/sounds/discord-notification.mp3');
        this.reminderCount = 0;
    }

    loadSettings() {
        return BdApi.loadData("Reminder", "settings") || this.defaultSettings;
    }

    saveSettings() {
        BdApi.saveData("Reminder", "settings", this.settings);
    }

    loadReminders() {
        const data = BdApi.loadData("Reminder", "reminders");
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error("Failed to parse reminders data:", e);
            }
        }
        return [];
    }

    saveReminders() {
        BdApi.saveData("Reminder", "reminders", JSON.stringify(this.reminders));
    }

    showModal(reminder) {
        if (this.settings.notificationSound) {
            this.audio.play();
        }
        this.reminderCount++;
        this.updateDiscordTitle();

        BdApi.showConfirmationModal(
            "Reminder",
            `${reminder.text}`, {
                confirmText: "OK",
                onConfirm: () => {
                    this.reminderCount = 0;
                    this.updateDiscordTitle();
                },
            }
        );
    }

    start() {
        this.checkReminders();
        this.addReminderButton();
        this.checkInterval = setInterval(() => this.checkReminders(), this.settings.reminderInterval);
        BdApi.Patcher.after("Reminder", BdApi.Webpack.getModule(m => m.default && m.default.displayName === "Inbox"), "default", (_, __, ret) => {
            const Inbox = ret.props.children[1];
            const original = Inbox.type;
            Inbox.type = (props) => {
                const result = original(props);
                result.props.children.unshift(this.createReminderInbox());
                return result;
            };
        });
        this.showChangelogIfNeeded();
    }

    stop() {
        BdApi.Patcher.unpatchAll("Reminder");
        clearInterval(this.checkInterval);
        const reminderButton = document.querySelector(".panels_a4d4d9 > div > button");
        if (reminderButton) {
            reminderButton.parentElement.remove();
        }
        this.reminderCount = 0;
        this.updateDiscordTitle();
    }

    addReminderButton() {
        const containerDiv = document.createElement("div");
        containerDiv.style.display = "flex";
        containerDiv.style.justifyContent = "center";
        containerDiv.style.margin = "10px";

        const button = document.createElement("button");
        button.textContent = "Add Reminder";
        button.style.background = "var(--bg-overlay-3, var(--channeltextarea-background))";
        button.style.outline = "none";
        button.style.border = "none";
        button.style.padding = "10px";
        button.style.borderRadius = "10px";
        button.style.width = "100%";
        button.style.color = "var(--text-normal)";
        button.style.cursor = "pointer";
        button.className = "reminder-button";
        button.onclick = () => this.openReminderModal();

        containerDiv.appendChild(button);

        const panel = document.querySelector(".panels_a4d4d9");
        if (panel) {
            panel.appendChild(containerDiv);
        }
    }

    openReminderModal() {
        const { React } = BdApi;
        const ModalContent = () => {
            const [reminderText, setReminderText] = React.useState("");
            const [reminderTime, setReminderTime] = React.useState("");

            return React.createElement("div", null,
                React.createElement("input", {
                    type: "text",
                    id: "reminderText",
                    placeholder: "Reminder text",
                    value: reminderText,
                    onChange: (e) => setReminderText(e.target.value),
                    required: true,
                    style: {
                        background: "var(--bg-overlay-3, var(--channeltextarea-background))",
                        outline: "none",
                        border: "none",
                        padding: "10px",
                        borderRadius: "10px",
                        width: "95%",
                        color: "var(--text-normal)",
                        margin: "10px 0",
                    }
                }),
                React.createElement("input", {
                    type: "time",
                    id: "reminderTime",
                    value: reminderTime,
                    onChange: (e) => setReminderTime(e.target.value),
                    required: true,
                    style: {
                        background: "var(--bg-overlay-3, var(--channeltextarea-background))",
                        outline: "none",
                        border: "none",
                        padding: "10px",
                        borderRadius: "10px",
                        width: "95%",
                        color: "var(--text-normal)",
                    }
                }),
                React.createElement("button", {
                    style: {
                        background: "var(--bg-overlay-3, var(--channeltextarea-background))",
                        border: "none",
                        padding: "10px",
                        borderRadius: "10px",
                        color: "var(--text-normal)",
                        cursor: "pointer",
                        marginTop: "10px",
                    },
                    onClick: () => this.showAllReminders()
                }, "View/Manage All Reminders")
            );
        };

        BdApi.showConfirmationModal(
            "Add Reminder",
            React.createElement(ModalContent), {
                confirmText: "Add",
                onConfirm: () => {
                    const reminderText = document.getElementById("reminderText").value;
                    const reminderTime = document.getElementById("reminderTime").value;

                    if (reminderText && reminderTime) {
                        const currentDate = new Date();
                        const [hours, minutes] = reminderTime.split(":");
                        currentDate.setHours(hours);
                        currentDate.setMinutes(minutes);
                        currentDate.setSeconds(0);
                        currentDate.setMilliseconds(0);

                        if (currentDate.getTime() < Date.now()) {
                            currentDate.setDate(currentDate.getDate() + 1);
                        }

                        this.addReminder(reminderText, currentDate);
                    }

                    BdApi.showToast(`Your reminder has been set and will alert you at the specified time.`, {
                        type: "success",
                    });
                },
            }
        );
    }

    addReminder(text, time) {
        const reminder = {
            text,
            time: time.getTime()
        };
        this.reminders.push(reminder);
        this.saveReminders();
    }

    deleteReminder(reminder) {
        this.reminders = this.reminders.filter(r => r.time !== reminder.time);
        this.saveReminders();
        this.openReminderModal();
    }

    checkReminders() {
        const now = Date.now();
        this.reminders.forEach(reminder => {
            if (reminder.time <= now) {
                this.showModal(reminder);

                this.reminders = this.reminders.filter(r => r.time > now);
                this.saveReminders();
            }
        });
    }

    showAllReminders() {
        const { React } = BdApi;
        const ReminderList = () => {
            return React.createElement("div", null,
                this.reminders.length === 0 ?
                React.createElement("p", {
                    style: {
                        color: "var(--text-normal)"
                    }
                }, "No reminders set.") :
                this.reminders.map(reminder =>
                    React.createElement("div", {
                            key: reminder.time,
                            style: {
                                color: "var(--text-normal)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                margin: "5px 0"
                            }
                        },
                        `${reminder.text} - ${new Date(reminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        React.createElement("button", {
                            style: {
                                background: "var(--bg-overlay-3, var(--channeltextarea-background))",
                                border: "none",
                                padding: "5px",
                                borderRadius: "5px",
                                color: "var(--text-normal)",
                                cursor: "pointer",
                                marginLeft: "10px"
                            },
                            onClick: () => this.deleteReminder(reminder)
                        }, "Delete")
                    )
                )
            );
        };

        BdApi.showConfirmationModal(
            "All Reminders",
            React.createElement(ReminderList), {
                confirmText: "Close",
                onConfirm: () => {},
            }
        );
    }

    updateDiscordTitle() {
        if (this.reminderCount > 0) {
            document.title = `(${this.reminderCount}) Reminder(s)`;
        } else {
            document.title = "Discord";
        }
    }

    createReminderInbox() {
        return BdApi.React.createElement("div", {
                className: "reminder-inbox"
            },
            BdApi.React.createElement("h2", {}, "Reminders"),
            ...this.reminders.map(reminder =>
                BdApi.React.createElement("div", {
                        style: {
                            color: "var(--text-normal)"
                        }
                    },
                    reminder.text)
            )
        );
    }

    showChangelog() {
        const { React } = BdApi;
        const Changelog = () => {
            return React.createElement("div", null,
                config.changelog.map(change =>
                    React.createElement("div", {
                            key: change.title,
                            style: {
                                marginBottom: "10px"
                            }
                        },
                        React.createElement("h3", {
                            style: {
                                color: "var(--text-normal)"
                            }
                        }, change.title),
                        React.createElement("ul", null,
                            change.items.map(item =>
                                React.createElement("li", {
                                    key: item,
                                    style: {
                                        color: "var(--text-normal)"
                                    }
                                }, item)
                            )
                        )
                    )
                )
            );
        };

        BdApi.showConfirmationModal(
            "Changelog",
            React.createElement(Changelog), {
                confirmText: "Close",
                onConfirm: () => {},
            }
        );
    }

    showChangelogIfNeeded() {
        const lastVersion = BdApi.loadData("Reminder", "lastVersion");
        if (lastVersion !== config.info.version) {
            this.showChangelog();
            BdApi.saveData("Reminder", "lastVersion", config.info.version);
        }
    }

    getSettingsPanel() {
        const { React } = BdApi;
        const Panel = () => {
            const [notificationSound, setNotificationSound] = React.useState(this.settings.notificationSound);
            const [reminderInterval, setReminderInterval] = React.useState(this.settings.reminderInterval);

            return React.createElement("div", {
                style: {
                    padding: "10px"
                }
            },
                React.createElement("div", {
                    style: {
                        marginBottom: "10px"
                    },
                    className: 'labelRow_ed1d57'
                },
                    React.createElement("label", { className: "title_ed1d57" }, "Notification Sound:"),
                    React.createElement("input", {
                        type: "checkbox",
                        checked: notificationSound,
                        onChange: (e) => {
                            setNotificationSound(e.target.checked);
                            this.settings.notificationSound = e.target.checked;
                            this.saveSettings();
                        },
                        className: "container_cebd1c"
                    })
                ),
                React.createElement("div", {
                    style: {
                        marginBottom: "10px"
                    },
                    className: 'control_ed1d57'
                },
                    React.createElement("label", { className: "title_ed1d57" }, "Reminder Interval (ms):"),
                    React.createElement("p", { className: "colorStandard_d1aa77 size14_e8b2ab description_b89ec7 formText_b89ec7 modeDefault_b89ec7", style: { margin: "3px 0 10px 0"} }, "This setting controls how often (in milliseconds) the plugin checks for upcoming reminders. A shorter interval ensures more timely notifications but may use more system resources."),
                    React.createElement("input", {
                        type: "number",
                        value: reminderInterval,
                        onChange: (e) => {
                            setReminderInterval(Number(e.target.value));
                            this.settings.reminderInterval = Number(e.target.value);
                            this.saveSettings();
                        },
                        style: {
                            background: "var(--bg-overlay-3, var(--channeltextarea-background))",
                            outline: "none",
                            border: "none",
                            padding: "10px",
                            borderRadius: "10px",
                            width: "100%",
                            color: "var(--text-normal)",
                        },
                        
                    })
                )
            );
        };

        return React.createElement(Panel);
    }
}

module.exports = !global.ZeresPluginLibrary ?
    class {
        constructor() {
            this._config = config;
        }

        getName() {
            return config.info.name;
        }

        getAuthor() {
            return config.info.author;
        }

        getVersion() {
            return config.info.version;
        }

        getDescription() {
            return config.info.description;
        }

        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for **${config.info.name}** is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://zerebos.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise((r) => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                },
            });
        }

        start() {}

        stop() {}
    } :
    class extends Reminder {
        constructor() {
            super();
        }

        load() {
            this.showChangelogIfNeeded();
        }
    };
