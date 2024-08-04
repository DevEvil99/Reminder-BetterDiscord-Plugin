/**
 * @name Reminder
 * @version 1.0
 * @description A BetterDiscord plugin that allows users to create, view, and manage custom reminders with notification support.
 * @author DevEvil
 * @website https://devevil.com
 * @invite jsQ9UP7kCA
 * @authorId 468132563714703390
 * @donate https://oxapay.com/donate/76037572
 */

const { BdApi } = window;

module.exports = class CustomReminders {
  constructor() {
    this.reminders = this.loadReminders();
    this.checkInterval = null;
    this.audio = new Audio('https://www.myinstants.com/media/sounds/discord-notification.mp3');
    this.reminderCount = 0; 
  }

  loadReminders() {
    const data = BdApi.loadData("CustomReminders", "reminders");
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
    BdApi.saveData("CustomReminders", "reminders", JSON.stringify(this.reminders));
  }

  showModal(reminder) {
    this.audio.play(); 
    this.reminderCount++; 
    this.updateDiscordIcon();

    BdApi.showConfirmationModal(
      "Reminder",
      `${reminder.text}`,
      {
        confirmText: "OK",
        onConfirm: () => {
          this.reminderCount = 0; 
          this.updateDiscordIcon();
        },
      }
    );
  }

  start() {
    this.checkReminders();
    this.addReminderButton();
    this.checkInterval = setInterval(() => this.checkReminders(), 1000); 
    BdApi.Patcher.after("CustomReminders", BdApi.Webpack.getModule(m => m.default && m.default.displayName === "Inbox"), "default", (_, __, ret) => {
      const Inbox = ret.props.children[1];
      const original = Inbox.type;
      Inbox.type = (props) => {
        const result = original(props);
        result.props.children.unshift(this.createReminderInbox());
        return result;
      };
    });
  }

  stop() {
    BdApi.Patcher.unpatchAll("CustomReminders");
    clearInterval(this.checkInterval); 
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
    button.onclick = () => this.openReminderModal();

    containerDiv.appendChild(button); 

    const toolbar = document.querySelector(".panels_a4d4d9");
    if (toolbar) {
      toolbar.appendChild(containerDiv); 
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
      React.createElement(ModalContent),
      {
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
        },
      }
    );
  }

  addReminder(text, time) {
    const reminder = { text, time: time.getTime() };
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
        this.reminders.length === 0
          ? React.createElement("p", { style: { color: "var(--text-normal)" } }, "No reminders set.")
          : this.reminders.map(reminder =>
              React.createElement("div", { key: reminder.time, style: { color: "var(--text-normal)", display: "flex", justifyContent: "space-between", alignItems: "center", margin: "5px 0" } },
                `${reminder.text} - ${new Date(reminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                React.createElement("button", {
                  style: {
                    background: "var(--bg-red)",
                    border: "none",
                    padding: "5px",
                    borderRadius: "5px",
                    color: "white",
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
      React.createElement(ReminderList),
      {
        confirmText: "Close",
        onConfirm: () => {},
      }
    );
  }

  updateDiscordIcon() {
    if (this.reminderCount > 0) {
      document.title = `(${this.reminderCount}) Reminder`; 
    } else {
      document.title = "Discord"; 
    }
  }

  createReminderInbox() {
    return BdApi.React.createElement("div", { className: "reminder-inbox" },
      BdApi.React.createElement("h2", {}, "Reminders"),
      ...this.reminders.map(reminder => 
        BdApi.React.createElement("div", { style: { color: "var(--text-normal)" } }, 
          reminder.text)
      )
    );
  }
};
