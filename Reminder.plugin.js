/**
 * @name Reminder
 * @version 1.3.3
 * @description A BetterDiscord plugin that allows users to create, view, and manage custom reminders with notification support.
 * @author DevEvil
 * @website https://devevil.com
 * @invite jsQ9UP7kCA
 * @authorId 468132563714703390
 * @donate https://devevil.com/dnt
 * @source https://github.com/DevEvil99/Reminder-BetterDiscord-Plugin
 * @updateUrl https://raw.githubusercontent.com/DevEvil99/Reminder-BetterDiscord-Plugin/main/Reminder.plugin.js
 */

const config = {
    info: {
        name: "Reminder",
        version: "1.3.3",
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
        title: "Mini Update - Version 1.3.3",
        type: "fixed",
        items: [
            "Fixed"
        ]
    }]
};

class Reminder {
    constructor() {
        this.defaultSettings = {
            notificationSound: true,
            notificationSoundURL: "https://devevil99.github.io/devevil/files/Discord-Notification.mp3",
            reminderInterval: 60000
        };
        this.settings = this.loadSettings();
        this.reminders = this.loadReminders();
        this.acknowledgedReminders = {};
        this.checkInterval = null;
        this.audio = new Audio(this.settings.notificationSoundURL);
        this.reminderCount = 0;
    }


    loadSettings() {
        return BdApi.loadData("Reminder", "settings") || this.defaultSettings;
    }

    saveSettings() {
        BdApi.saveData("Reminder", "settings", this.settings);
    }

    playNotificationSound() {
        if (this.settings.notificationSound) {
            try {
                this.audio.src = this.settings.notificationSoundURL || this.defaultSettings.notificationSoundURL;
                this.audio.play();
            } catch (e) {
                console.error("Error playing notification sound:", e);
            }
        }
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
        this.playNotificationSound();
        this.reminderCount++;
        this.updateDiscordTitle();

        BdApi.showConfirmationModal(
            "Reminder",
            reminder.text, {
                confirmText: "OK",
                cancelText: null,
                onConfirm: () => {
                    this.reminderCount = 0;
                    this.updateDiscordTitle();
                    this.acknowledgedReminders[reminder.time] = true;
                }
            }
        );
    }

    start() {
        if (!BdApi.loadData("Reminder", "settings")) {
            BdApi.saveData("Reminder", "settings", this.defaultSettings);
        }

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
        const reminderButton = document.querySelector(".panels_c48ade > div > button");
        if (reminderButton) {
            reminderButton.parentElement.remove();
        }
        this.reminderCount = 0;
        this.updateDiscordTitle();
    }

    addReminderButton() {
        const containerDiv = document.createElement("div");
        containerDiv.style.display = "flex";
        containerDiv.style.justifyContent = "space-between";
        containerDiv.style.alignItems = "center";
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


        const panel = document.querySelector(".panels_c48ade");
        if (panel) {
            panel.appendChild(containerDiv);
        }
    }

    openHelpModal() {
        const {
            React
        } = BdApi;

        const HelpContent = () => {
            return React.createElement("div", null,
                React.createElement("h4", {
                    style: {
                        color: "var(--header-primary)",
                        marginBottom: "10px"
                    }
                }, "How to Add a Reminder"),
                React.createElement("ul", {
                        style: {
                            color: "var(--text-normal)",
                            marginLeft: "20px",
                            listStyle: "circle"
                        }
                    },
                    React.createElement("li", {
                        style: {
                            marginBottom: "10px"
                        }
                    }, "Enter a brief description in the 'Reminder Text' field."),
                    React.createElement("li", {
                        style: {
                            marginBottom: "10px"
                        }
                    }, "Set the time for your reminder using the 'Reminder Time' field."),
                    React.createElement("li", {
                        style: {
                            marginBottom: "10px"
                        }
                    }, "Click 'Add Reminder' to save the reminder."),
                    React.createElement("li", {
                        style: {
                            marginBottom: "10px"
                        }
                    }, "Your reminder will alert you at the specified time!"),
                    React.createElement("li", {
                        style: {
                            marginBottom: "10px"
                        }
                    }, "Repeatable Reminder: This feature repeats your reminders up to 3 times at 5-minute intervals, ensuring you're alerted even if you miss the initial prompt.")

                )
            );
        };

        BdApi.showConfirmationModal(
            "Reminder Guide",
            React.createElement(HelpContent), {
                confirmText: "Close",
            }
        );
    }

    openReminderModal() {
        const {
            React
        } = BdApi;
        const ModalContent = () => {
            const [reminderText, setReminderText] = React.useState("");
            const [reminderTime, setReminderTime] = React.useState("");
            const [repeatable, setRepeatable] = React.useState(false);

            return React.createElement("div", {
                    style: {
                        position: "relative"
                    }
                },
                React.createElement("svg", {
                        xmlns: "http://www.w3.org/2000/svg",
                        viewBox: "0 0 24 24",
                        width: "24",
                        height: "24",
                        fill: "var(--__lottieIconColor,var(--interactive-normal))",
                        style: {
                            position: "absolute",
                            bottom: "0",
                            right: "0",
                            cursor: "pointer"
                        },
                        title: "How to Add a Reminder",
                        onClick: () => this.openHelpModal()
                    },
                    React.createElement("path", {
                        d: "M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.008-3.018a1.502 1.502 0 0 1 2.522 1.159v.024a1.44 1.44 0 0 1-1.493 1.418 1 1 0 0 0-1.037.999V14a1 1 0 1 0 2 0v-.539a3.44 3.44 0 0 0 2.529-3.256 3.502 3.502 0 0 0-7-.255 1 1 0 0 0 2 .076c.014-.398.187-.774.48-1.044Zm.982 7.026a1 1 0 1 0 0 2H12a1 1 0 1 0 0-2h-.01Z"
                    })),
                React.createElement("div", {
                        style: {
                            marginBottom: "15px"
                        }
                    },
                    React.createElement("h4", {
                        style: {
                            color: "var(--header-primary)",
                            marginBottom: "5px"
                        }
                    }, "Reminder Text"),
                    React.createElement("p", {
                        style: {
                            color: "var(--header-primary)",
                            marginBottom: "5px",
                            fontSize: "12px"
                        }
                    }, "Enter a short description of your reminder (e.g., 'Call friend', 'Message @devevil at 6 PM')."),
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
                            color: "var(--header-primary)",
                        }
                    })
                ),
                React.createElement("div", {
                        style: {
                            marginBottom: "15px"
                        }
                    },
                    React.createElement("h4", {
                        style: {
                            color: "var(--header-primary)",
                            marginBottom: "5px"
                        }
                    }, "Reminder Time"),
                    React.createElement("p", {
                        style: {
                            color: "var(--header-primary)",
                            marginBottom: "5px",
                            fontSize: "12px"
                        }
                    }, "Select the time for the reminder by clicking on the clock icon."),
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
                            color: "var(--header-primary)",
                        }
                    })
                ),
                React.createElement("div", {
                        style: {
                            marginBottom: "15px"
                        }
                    },
                    React.createElement("h4", {
                        style: {
                            color: "var(--header-primary)",
                            marginBottom: "5px"
                        }
                    }, "Repeatable Reminder"),
                    React.createElement("label", {
                            style: {
                                color: "var(--header-primary)",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                                position: "relative",
                                paddingLeft: "30px",
                                userSelect: "none"
                            }
                        },
                        React.createElement("input", {
                            type: "checkbox",
                            id: "repeatable",
                            checked: repeatable,
                            onChange: () => setRepeatable(!repeatable),
                            style: {
                                opacity: 0,
                                position: "absolute",
                                left: "0",
                                top: "0",
                                height: "20px",
                                width: "20px",
                                cursor: "pointer"
                            }
                        }),
                        React.createElement("span", {
                            style: {
                                position: "absolute",
                                left: "0",
                                top: "0",
                                height: "20px",
                                width: "20px",
                                backgroundColor: "var(--bg-overlay-3, var(--channeltextarea-background))",
                                borderRadius: "5px",
                                transition: "0.2s ease-in-out",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.5)",
                            }
                        }, repeatable && React.createElement("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            height: "16",
                            width: "16",
                            fill: "var(--interactive-active)",
                            viewBox: "0 0 24 24"
                        }, React.createElement("path", {
                            d: "M20.285 6.709a1 1 0 0 0-1.414-1.414l-9.928 9.929-3.535-3.535a1 1 0 1 0-1.414 1.414l4.243 4.243a1 1 0 0 0 1.414 0l10.634-10.637Z"
                        }))),
                        "Repeat this reminder up to 3 times every 5 minutes unless acknowledged (Pressing 'OK')."
                    )
                ),
                React.createElement("button", {
                    style: {
                        background: "var(--bg-overlay-3, var(--channeltextarea-background))",
                        border: "none",
                        padding: "10px",
                        borderRadius: "10px",
                        color: "var(--text-normal)",
                        cursor: "pointer",
                        marginTop: "10px"
                    },
                    onClick: () => this.showAllReminders()
                }, "View/Manage All Reminders")
            );
        };

        BdApi.showConfirmationModal(
            "Add Reminder",
            React.createElement(ModalContent), {
                confirmText: "Add Reminder",
                onConfirm: () => {
                    const reminderText = document.getElementById("reminderText").value;
                    const reminderTime = document.getElementById("reminderTime").value;
                    const repeatable = document.getElementById("repeatable").checked;

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

                        this.addReminder(reminderText, currentDate, repeatable);
                        BdApi.showToast("Your reminder has been set and will alert you at the specified time.", {
                            type: "success"
                        });
                    } else {
                        BdApi.showToast("Please fill out Reminder Text & Reminder Time fields before adding a reminder.", {
                            type: "error"
                        });
                    }
                }
            }
        );
    }

    addReminder(text, time, repeatable) {
        const reminder = {
            text,
            time: time.getTime(),
            repeatable,
            repeatCount: 0,
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
                if (this.acknowledgedReminders[reminder.time]) {
                    return;
                }

                this.showModal(reminder);

                if (reminder.repeatable && reminder.repeatCount < 3) {
                    reminder.time = now + 5 * 60 * 1000;
                    reminder.repeatCount += 1;
                } else {
                    this.reminders = this.reminders.filter(r => r !== reminder);
                }
                this.saveReminders();
            }
        });
    }

    showAllReminders() {
        const { React } = BdApi;
        const ReminderList = () => {
            return React.createElement("div", {
                    style: {
                        padding: "5px"
                    }
                },
                this.reminders.length === 0 ?
                React.createElement("p", {
                    style: {
                        color: "var(--text-muted)",
                        fontSize: "16px",
                        textAlign: "center",
                        margin: "10px 0"
                    }
                }, "No reminders set.") :
                this.reminders.map(reminder =>
                    React.createElement("div", {
                            key: reminder.time,
                            style: {
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px",
                                margin: "10px 0",
                                backgroundColor: "var(--background-tertiary)",
                                borderRadius: "8px",
                                transition: "background-color 0.3s",
                                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)"
                            },
                            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = "var(--background-secondary)",
                            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = "var(--background-tertiary)"
                        },
                        React.createElement("span", {
                            style: {
                                color: "var(--text-normal)",
                                fontSize: "14px",
                                fontWeight: "500",
                                flexGrow: "1"
                            }
                        }, `${reminder.text} - ${new Date(reminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
                        React.createElement("button", {
                            style: {
                                background: "var(--button-secondary-background)",
                                border: "1px solid var(--button-secondary-border)",
                                padding: "5px 10px",
                                borderRadius: "5px",
                                color: "var(--text-normal)",
                                cursor: "pointer",
                                transition: "background-color 0.3s, color 0.3s",
                                fontSize: "14px"
                            },
                            onMouseEnter: (e) => {
                                e.target.style.backgroundColor = "var(--button-danger-background)";
                                e.target.style.color = "var(--text-on-danger)";
                            },
                            onMouseLeave: (e) => {
                                e.target.style.backgroundColor = "var(--button-secondary-background)";
                                e.target.style.color = "var(--text-normal)";
                            },
                            onClick: () => this.deleteReminder(reminder)
                        }, "Delete")
                    )
                )
            );
        };
    
        BdApi.showConfirmationModal(
            "Reminder Inbox",
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
        const {
            React
        } = BdApi;

        const Changelog = () => {
            return React.createElement("div", {
                    style: {
                        maxWidth: "600px",
                        margin: "0 auto",
                        textAlign: "left",
                        color: "var(--text-normal)",
                        lineHeight: "1.5"
                    }
                },
                config.changelog.map(change =>
                    React.createElement("div", {
                            key: change.title,
                            style: {
                                marginBottom: "20px",
                                borderBottom: "1px solid var(--background-modifier-accent)",
                                paddingBottom: "10px"
                            }
                        },
                        React.createElement("h3", {
                            style: {
                                color: "var(--header-secondary)",
                                fontSize: "16px",
                                marginBottom: "10px"
                            }
                        }, `${change.type === "added" ? "🆕 " : "🛠️ "}${change.title}`),
                        React.createElement("ul", {
                                style: {
                                    paddingLeft: "20px",
                                    listStyle: "disc"
                                }
                            },
                            change.items.map(item =>
                                React.createElement("li", {
                                    key: item,
                                    style: {
                                        marginBottom: "5px"
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
                confirmText: "Got it!",
                cancelText: null,
                onConfirm: () => {}
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
        const {
            React
        } = BdApi;

        const Common = BdApi.Webpack.getModule(m => m.FormSwitch) || {
            FormSwitch: (props) => React.createElement("input", {
                type: "checkbox",
                checked: props.value,
                onChange: (e) => props.onChange(e.target.checked),
                style: {
                    marginRight: "10px"
                }
            })
        };


        const Panel = () => {
            const [notificationSound, setNotificationSound] = React.useState(this.settings.notificationSound);
            const [notificationSoundURL, setNotificationSoundURL] = React.useState(this.settings.notificationSoundURL);
            const [reminderInterval, setReminderInterval] = React.useState(this.settings.reminderInterval);

            return React.createElement("div", {
                    style: {
                        padding: "10px"
                    }
                },
                React.createElement("div", null,
                    React.createElement(Common.FormSwitch, {
                        children: "Notification Sound",
                        note: "Enable or disable the notification sound.",
                        value: notificationSound,
                        onChange: (v) => {
                            setNotificationSound(v);
                            this.settings.notificationSound = v;
                            this.saveSettings();
                        }
                    })
                ),
                React.createElement("div", {
                        style: {
                            margin: "15px 0"
                        }
                    },
                    React.createElement("label", {
                        className: "title_ed1d57"
                    }, "Notification Sound MP3 URL:"),
                    React.createElement("p", {
                        className: "colorStandard_d1aa77 size14_e8b2ab description_b89ec7 formText_b89ec7 modeDefault_b89ec7",
                        style: {
                            margin: "3px 0 10px 0"
                        }
                    }, "Example: https://www.myinstants.com/media/sounds/discord-notification.mp3"),
                    React.createElement("input", {
                        type: "text",
                        value: notificationSoundURL,
                        placeholder: "Enter custom sound URL",
                        onChange: (e) => {
                            setNotificationSoundURL(e.target.value);
                            this.settings.notificationSoundURL = e.target.value;
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
                ),
                React.createElement("div", {
                        style: {
                            marginBottom: "10px"
                        },
                        className: 'control_ed1d57'
                    },
                    React.createElement("label", {
                        className: "title_ed1d57"
                    }, "Reminder Interval (ms):"),
                    React.createElement("p", {
                        className: "colorStandard_d1aa77 size14_e8b2ab description_b89ec7 formText_b89ec7 modeDefault_b89ec7",
                        style: {
                            margin: "3px 0 10px 0"
                        }
                    }, "This setting controls how often (in milliseconds) the plugin checks for upcoming reminders. The default interval is 1 minute (60000 milliseconds). Shorter intervals provide more frequent checks but may use more system resources."),
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

module.exports = class extends Reminder {
    constructor() {
        super();
    }

    load() {
        this.showChangelogIfNeeded();
    }
};
