import {
  NotebookPanel,
  INotebookTracker
} from '@jupyterlab/notebook';

import { CommandRegistry } from '@phosphor/commands';

import {
  Kernel
} from '@jupyterlab/services';
//
export class NotebookInfo {
  notebook: NotebookPanel;
  KernelList: Array<string>;

  sos_comm: Kernel.IComm;

  BackgroundColor: Map<string, string>;
  DisplayName: Map<string, string>;
  KernelName: Map<string, string>;
  LanguageName: Map<string, string>;
  CodeMirrorMode: Map<string, any>;
  KernelOptions: Map<string, string>;

  autoResume: boolean;
  pendingCells: Map<any, any>;
  /** create an info object from metadata of the notebook
  */
  constructor(notebook: NotebookPanel) {
    this.notebook = notebook;
    this.KernelList = new Array<string>();
    this.autoResume = false;
    this.sos_comm = null;

    this.BackgroundColor = new Map<string, string>();
    this.DisplayName = new Map<string, string>();
    this.KernelName = new Map<string, string>();
    this.LanguageName = new Map<string, string>();
    this.KernelOptions = new Map<string, any>();
    this.CodeMirrorMode = new Map<string, any>();

    this.pendingCells = new Map<any, any>();

    let data = [['SoS', 'sos', '', '']];
    if (notebook.model.metadata.has('sos'))
      data = (notebook.model.metadata.get('sos') as any)['kernels'];
    // fill the look up tables with language list passed from the kernel
    for (let i = 0; i < data.length; i++) {
      // BackgroundColor is color
      this.BackgroundColor.set(data[i][0], data[i][3]);
      this.BackgroundColor.set(data[i][1], data[i][3]);
      // DisplayName
      this.DisplayName.set(data[i][0], data[i][0]);
      this.DisplayName.set(data[i][1], data[i][0]);
      // Name
      this.KernelName.set(data[i][0], data[i][1]);
      this.KernelName.set(data[i][1], data[i][1]);
      // LanguageName
      this.LanguageName.set(data[i][0], data[i][2]);
      this.LanguageName.set(data[i][1], data[i][2]);

      // if codemirror mode ...
      if (data[i].length >= 5 && data[i][4]) {
        this.CodeMirrorMode.set(data[i][0], data[i][4]);
      }

      this.KernelList.push(data[i][0]);
    }
  }

  updateLanguages(data: Array<Array<string>>) {
    for (let i = 0; i < data.length; i++) {
      // BackgroundColor is color
      this.BackgroundColor.set(data[i][0], data[i][3]);
      // by kernel name? For compatibility ...
      if (!(data[i][1] in this.BackgroundColor)) {
        this.BackgroundColor.set(data[i][1], data[i][3]);
      }
      // DisplayName
      this.DisplayName.set(data[i][0], data[i][0]);
      if (!(data[i][1] in this.DisplayName)) {
        this.DisplayName.set(data[i][1], data[i][0]);
      }
      // Name
      this.KernelName.set(data[i][0], data[i][1]);
      if (!(data[i][1] in this.KernelName)) {
        this.KernelName.set(data[i][1], data[i][1]);
      }
      // Language Name
      this.LanguageName.set(data[i][0], data[i][2]);
      if (!(data[i][2] in this.LanguageName)) {
        this.LanguageName.set(data[i][2], data[i][2]);
      }
      // if codemirror mode ...
      if (data[i].length > 4 && data[i][4]) {
        this.CodeMirrorMode.set(data[i][0], data[i][4]);
      }
      // if options ...
      if (data[i].length > 5) {
        this.KernelOptions.set(data[i][0], data[i][5]);
      }


      if (this.KernelList.indexOf(data[i][0]) === -1)
        this.KernelList.push(data[i][0]);
    }

    // add css to window
    let css_text = this.KernelList.map(
      // add language specific css
      (lan: string) => {
        if (this.BackgroundColor.get(lan)) {
          return `.jp-CodeCell.sos_lan_${lan} .jp-InputPrompt,
            .jp-CodeCell.sos_lan_${lan} .jp-OutputPrompt {
              background: ${this.BackgroundColor.get(lan)};
            }
          `;
        } else {
          return null;
        }
      }
      ).filter(Boolean).join('\n');
    var css = document.createElement("style");
    css.type = "text/css";
    css.innerHTML = css_text;
    document.body.appendChild(css);
  }

  public show() {
    console.log(this.KernelList);
  }
}

export class Manager {
  // global registry for notebook info
  private static _instance: Manager;
  // used to track the current notebook widget
  private static _tracker: INotebookTracker;
  private static _commands: CommandRegistry;
  private _info: Map<NotebookPanel, NotebookInfo>;

  private constructor() {
    if (!this._info) {
      this._info = new Map<NotebookPanel, NotebookInfo>();
    }
  }

  public static set_tracker(tracker: INotebookTracker) {
    this._tracker = tracker;
  }

  public static set_commands(commands: CommandRegistry) {
    this._commands = commands;
  }

  static get currentNotebook() {
    return this._tracker.currentWidget;
  }

  static get commands() {
    return this._commands;
  }

  static get manager() {
    if (this._instance === null || this._instance === undefined)
      this._instance = new Manager();
    return this._instance;
  }

  // register notebook info to the global registry
  public get_info(notebook: NotebookPanel): NotebookInfo {
    if (!this._info.has(notebook)) {
      console.log("Creating a new notebook info")
      this._info.set(notebook, new NotebookInfo(notebook));
    }
    return this._info.get(notebook);
  }

  public register_comm(comm: Kernel.IComm, notebook: NotebookPanel) {
    this.get_info(notebook).sos_comm = comm;
  }

  // this is the same as get_info,
  public notebook_of_comm(comm_id: string): NotebookPanel {
    for (let [panel, info] of Array.from(this._info.entries()))
      if (info.sos_comm && info.sos_comm.commId === comm_id)
        return panel;
  }
}
