/**
 * @name Reminder
 * @version 1.4
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
        version: "1.4",
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
    }
};

const {
    Components,
    ContextMenu,
    Data,
    DOM,
    Logger,
    Net,
    Patcher,
    Plugins,
    ReactUtils,
    Themes,
    UI,
    Utils,
    Webpack,
    React
} = new BdApi();

class Reminder {
    constructor() {
        this.defaultSettings = {
            notificationSound: true,
            notificationSoundURL: "https://devevil99.github.io/devevil/files/Discord-Notification.mp3",
            reminderInterval: 60000,
            reminderShortcut: "Shift+R",
            buttonLocation: "both"
        };
        this.settings = this.loadSettings();
        this.reminders = this.loadReminders();
        this.acknowledgedReminders = {};
        this.checkInterval = null;
        this.audio = new Audio(this.settings.notificationSoundURL);
        this.reminderCount = 0;
    }



    loadSettings() {
        const saved = Data.load("Reminder", "settings") || {};
        return Object.assign({}, this.defaultSettings, saved);
    }

    saveSettings() {
        Data.save("Reminder", "settings", this.settings);
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
        const data = Data.load("Reminder", "reminders");
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
        Data.save("Reminder", "reminders", JSON.stringify(this.reminders));
    }

    showModal(reminder) {
        this.playNotificationSound();
        this.reminderCount++;
        this.updateDiscordTitle();

        UI.showConfirmationModal(
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
        if (!Data.load("Reminder", "settings")) {
            this.saveSettings();
        }
        

        this.keybindHandler = (e) => {
            const keybind = this.settings.reminderShortcut || this.defaultSettings.reminderShortcut;
            
            const keys = keybind.toLowerCase().split("+").map(k => k.trim());
            const shift = keys.includes("shift") ? e.shiftKey : true;
            const ctrl = keys.includes("ctrl") ? e.ctrlKey : true;
            const alt = keys.includes("alt") ? e.altKey : true;
            const meta = keys.includes("cmd") || keys.includes("meta") ? e.metaKey : true;
            const key = keys.find(k => !["shift", "ctrl", "alt", "cmd", "meta"].includes(k));

            if (shift && ctrl && alt && meta && e.key.toLowerCase() === key.toLowerCase()) {
                this.openReminderModal();
            }
        };
        document.addEventListener("keydown", this.keybindHandler);
        

        this.checkReminders();
        this.addReminderButton();
        this.addReminderSidebar();
        this.checkInterval = setInterval(() => this.checkReminders(), this.settings.reminderInterval);
        Patcher.after("Reminder", Webpack.getModule(m => m.default && m.default.displayName === "Inbox"), "default", (_, __, ret) => {
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
        Patcher.unpatchAll("Reminder");
        clearInterval(this.checkInterval);
        const reminderButton = document.querySelector(".panels_c48ade > div > button");
        if (reminderButton) {
            reminderButton.parentElement.remove();
        }
        this.reminderCount = 0;
        this.updateDiscordTitle();

        document.removeEventListener("keydown", this.keybindHandler);

        if (this.guildsNavObserver) this.guildsNavObserver.disconnect();
        document.querySelector('.reminderPluginSideBtn')?.parentElement?.remove();

    }

    addReminderButton() {
        if (!["userarea", "both"].includes(this.settings.buttonLocation)) return;

        const containerDiv = document.createElement("div");
        containerDiv.style.display = "flex";
        containerDiv.style.justifyContent = "space-between";
        containerDiv.style.alignItems = "center";
        containerDiv.style.margin = "10px";


        const button = document.createElement("button");
        button.textContent = "Add Reminder";
        button.style.background = "var(--bg-base-tertiary)";
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

    addReminderSidebar() {
        if (!["sidebar", "both"].includes(this.settings.buttonLocation)) return;

        const observer = new MutationObserver(() => {
            const guildsNav = document.querySelector('.itemsContainer_ef3116');
            if (!guildsNav || guildsNav.querySelector('.reminderPluginSideBtn')) return;

            
            const listItem = document.createElement("div");
            listItem.className = "listItem__650eb";

            const listItemWrapper = document.createElement("div");
            listItemWrapper.className = "listItemWrapper__91816 reminderWrapper";

            listItemWrapper.style.marginLeft = '20px';

            const wrapper = document.createElement("div");
            wrapper.className = "wrapper_cc5dd2 reminderPluginSideBtn";

            wrapper.innerHTML = `
            <svg width="48" height="48" viewBox="-4 -4 48 48" class="svg_cc5dd2" overflow="visible" style="cursor: pointer;">
                <defs>
                    <path d="M0 17.4545C0 11.3449 0 8.29005 1.18902 5.95647C2.23491 3.90379 3.90379 2.23491 5.95647 1.18902C8.29005 0 11.3449 0 17.4545 0H22.5455C28.6551 0 31.71 0 34.0435 1.18902C36.0962 2.23491 37.7651 3.90379 38.811 5.95647C40 8.29005 40 11.3449 40 17.4545V22.5455C40 28.6551 40 31.71 38.811 34.0435C37.7651 36.0962 36.0962 37.7651 34.0435 38.811C31.71 40 28.6551 40 22.5455 40H17.4545C11.3449 40 8.29005 40 5.95647 38.811C3.90379 37.7651 2.23491 36.0962 1.18902 34.0435C0 31.71 0 28.6551 0 22.5455V17.4545Z" id="reminder-blob-mask"></path>
                </defs>
                <mask id="reminder-mask" fill="black" x="0" y="0" width="40" height="40">
                    <use href="#reminder-blob-mask" fill="white" />
                </mask>
                <foreignObject mask="url(#reminder-mask)" x="0" y="0" width="40" height="40">
                    <div class="circleIconButton__5bc7e" aria-label="Reminders" role="treeitem" tabindex="-1">
                        <svg class="circleIcon__5bc7e" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"
                            width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path fill="currentColor"
                                d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2Zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z" />
                        </svg>
                    </div>
                </foreignObject>
            </svg>
                    `;

            wrapper.onclick = () => this.openReminderModal();

            listItem.appendChild(listItemWrapper);

            listItemWrapper.appendChild(wrapper);
            UI.createTooltip(wrapper, "Add Reminder", { style: "primary", side: "right" });
            


            const separator = guildsNav.querySelector('[aria-label="Servers"]');
            if (separator?.parentElement) {
                separator.parentElement.insertBefore(listItemWrapper, separator);
            } else {
                guildsNav.appendChild(listItemWrapper);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        this.guildsNavObserver = observer;
    }

    refreshReminderButtons() {
        document.querySelector(".reminder-button")?.parentElement?.remove();
    
        document.querySelector(".reminderPluginSideBtn")?.parentElement?.remove();
    
        this.addReminderButton();
        this.addReminderSidebar();
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
                    }, "Set the time for your reminder using the 'Reminder Time' field by clicking on the clock icon."),
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

        UI.showConfirmationModal(
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
                    React.createElement("input", {
                        type: "text",
                        id: "reminderText",
                        placeholder: "Reminder text",
                        value: reminderText,
                        onChange: (e) => setReminderText(e.target.value),
                        required: true,
                        style: {
                            background: "var(--bg-base-tertiary)",
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
                    React.createElement("input", {
                        type: "time",
                        id: "reminderTime",
                        value: reminderTime,
                        onChange: (e) => setReminderTime(e.target.value),
                        required: true,
                        style: {
                            background: "var(--bg-base-tertiary)",
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
                                backgroundColor: "var(--bg-base-tertiary)",
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
                React.createElement(
                    "button",
                    {
                      style: {
                        background: "var(--bg-base-tertiary)",
                        border: "none",
                        padding: "10px",
                        borderRadius: "10px",
                        color: "var(--text-normal)",
                        cursor: "pointer",
                        marginTop: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      },
                      onClick: () => this.showAllReminders()
                    },

                    React.createElement(
                      "svg",
                      {
                        xmlns: "http://www.w3.org/2000/svg",
                        width: "16",
                        height: "16",
                        fill: "currentColor",
                        viewBox: "0 0 16 16"
                      },
                      React.createElement("path", {
                        d: "M8 3.5a.5.5 0 0 1 .5.5v4h3a.5.5 0 0 1 0 1H8a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"
                      }),
                      React.createElement("path", {
                        d: "M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14z"
                      })
                    ),
                    "View/Manage All Reminders"
                )                  
            );
        };

        UI.showConfirmationModal(
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
                        UI.showToast("Your reminder has been set and will alert you at the specified time.", {
                            type: "success"
                        });
                    } else {
                        UI.showToast("Please fill out Reminder Text & Reminder Time fields before adding a reminder.", {
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
    
        UI.showConfirmationModal(
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
        return React.createElement("div", {
                className: "reminder-inbox"
            },
            React.createElement("h2", {}, "Reminders"),
            ...this.reminders.map(reminder =>
                React.createElement("div", {
                        style: {
                            color: "var(--text-normal)"
                        }
                    },
                    reminder.text)
            )
        );
    }

    showChangelog() {
        const changes = [
            {
                title: "Major Update - Version 1.4",
                type: "added",
                items: [
                    "✨ Default Shortcut: Added 'Shift+R' to open the reminder modal (customizable in settings).",
                    "🔔 Second Reminder Button: Added a new Reminder button in the left sidebar.",
                    "📍 Customizable Button Location: New setting to choose where the Reminder button appears—User Area, Sidebar, or Both (default is Both).",
                    "⌨️ Shortcut Customization: Added an option to customize or change the Reminder shortcut.",
                    "🎨 UI Enhancements: Updated the colors of various elements for a fresher look.",
                    "👾 Simplified Reminder Modal: Removed the descriptions in the Reminder Modal for a cleaner, more minimal design. Descriptions are available in the Reminder Guide Modal (accessible via the ? icon).",
                    "🎨 New Changelog: A cleaner, more organized changelog—just like this one!"
                ]
            }
        ];
    
        const options = {
            title: "Reminder Plugin",
            subtitle: "By DevEvil",
            changes: changes, 
        };
    
        UI.showChangelogModal({
            title: options.title,
            subtitle: options.subtitle,
            //blurb: options.blurb,
            //banner: options.banner,
            //video: options.video,
            //poster: options.poster,
            //footer: options.footer,
            changes: options.changes
        });

    }
    


    showChangelogIfNeeded() {
        const lastVersion = Data.load("Reminder", "lastVersion");
        if (lastVersion !== config.info.version) {
            this.showChangelog();
            Data.save("Reminder", "lastVersion", config.info.version);
        }
    }

    getSettingsPanel() {
        return UI.buildSettingsPanel({
            settings: [
                {
                    type: "radio",
                    id: "buttonLocation",
                    name: "Reminder Button Location",
                    note: "Choose where the Reminder button should appear.",
                    options: [
                        { name: "User Area", value: "userarea" },
                        { name: "Sidebar", value: "sidebar" },
                        { name: "Both", value: "both" }
                    ],
                    value: this.settings.buttonLocation,
                    onChange: (value) => {
                        this.settings.buttonLocation = value;
                        this.saveSettings();
    
                        this.refreshReminderButtons();
                        UI.showToast("Button location updated!", { type: "success" });
                    }
                },                
                {
                    type: "switch",
                    id: "notificationSound",
                    name: "Notification Sound",
                    note: "Enable or disable the notification sound.",
                    value: this.settings.notificationSound,
                    onChange: (value) => {
                        this.settings.notificationSound = value;
                        this.saveSettings();
                    }
                },
                {
                    type: "text",
                    id: "notificationSoundURL",
                    name: "Notification Sound URL",
                    note: "MP3 URL for the notification sound. Example: https://www.myinstants.com/media/sounds/discord-notification.mp3",
                    value: this.settings.notificationSoundURL,
                    placeholder: "Enter custom sound URL",
                    onChange: (value) => {
                        this.settings.notificationSoundURL = value;
                        this.saveSettings();
                    }
                },
                {
                    type: "number",
                    id: "reminderInterval",
                    name: "Reminder Check Interval (ms)",
                    note: "This setting controls how often (in milliseconds) the plugin checks for upcoming reminders. The default interval is 1 minute (60000 milliseconds). Shorter intervals provide more frequent checks but may use more system resources.",
                    value: this.settings.reminderInterval,
                    min: 10000,
                    max: 300000,
                    step: 5000,
                    onChange: (value) => {
                        this.settings.reminderInterval = value;
                        this.saveSettings();
                    }
                },
                {
                    type: "text",
                    id: "reminderShortcut",
                    name: "Reminder Shortcut",
                    note: "Set your preferred shortcut to open the reminder modal (e.g., Shift+R, Ctrl+Alt+R).",
                    value: this.settings.reminderShortcut,
                    placeholder: "Shift+R",
                    onChange: (value) => {
                        this.settings.reminderShortcut = value;
                        this.saveSettings();
                    }
                }                
            ],
            onChange: (category, id, value) => {
                UI.showToast(`Updated ${id} to ${value}`, {
                    type: "success"
                });
            }
        });
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
