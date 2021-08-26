import { View, Constructor, MarkdownView, Plugin } from "obsidian";
import { around } from "monkey-around";

export default class RegExSearch extends Plugin {
  async onload() {
    this.registerEvent(this.app.workspace.on("layout-change", this.registerMonkeyPatches));
  }

  onunload() {
	this.app.workspace.off("layout-change", this.registerMonkeyPatches)
  }

  getViewsOfType<T extends View>(type: Constructor<T>): Array<T> {
    return this.app.workspace
      .getLeavesOfType("markdown")
      .filter(l => l && l.view && l.view instanceof type)
      .map(l => l.view as T);
  }

  registerMonkeyPatches() {
    this.getViewsOfType(MarkdownView).forEach(view => {
      this.register(
        around((view as any).sourceMode.search, {
          getQuery(next) {
            return function () {
              let query = this.searchInputEl.value;
              const isRE = query.match(/^\/(.*)\/([a-z]*)$/);
              if (isRE) {
                try {
                  // allow for case insensitive regex using /foo/i
                  query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i");
                } catch (e) {} // Not a regular expression after all, fallback to default method
              } else {
                query = next.call(this);
              }
              return query;
            };
          },
        })
      );
    });
  }
}
