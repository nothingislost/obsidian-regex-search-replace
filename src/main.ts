import { Plugin, MarkdownSourceView, WorkspaceLeaf, MarkdownView } from "obsidian";
import { around } from "monkey-around";

declare module "obsidian" {
  interface MarkdownSourceView {
    showSearch(replace?: boolean): void;
    editorEl(): HTMLTextAreaElement;
    search: any;
  }
}

let searchClass: any = null;
let searchObjects: WeakMap<MarkdownSourceView, any> = new WeakMap();

function fillCaptureGroups(n: string, i: any[]) {
  return n.replace(/[$](\d)/g, function (_: any, idx: number) {
    if (i[idx] != null) {
      return i[idx];
    } else {
      return "";
    }
  });
}

function getSearch(view: MarkdownSourceView) {
  if (searchObjects.has(view)) {
    // return if our class is already configured
    return searchObjects.get(view);
  }

  if (!searchClass) searchClass = class extends view.search.constructor {
    getQuery() { 
        let query = this.searchInputEl.value;
        const isRE = query.match(/^\/(.*)\/([a-z]*)$/);
        if (isRE) {
          try {
            // allow for case insensitive regex using /foo/i
            query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i");
          } catch (e) {} // Not a regular expression after all, fallback to default method
        } else {
          query = this.searchInputEl.value;
        }
        return query;
     }

    replaceCurrentMatch() {
      if (this.cmSearchCursor) {
          if (this.cmSearchCursor.pos.match && this.cmSearchCursor.pos.match.length > 1) {
             e = fillCaptureGroups(this.replaceInputEl.value, this.cmSearchCursor.pos.match)
          } else {
            var e = this.replaceInputEl.value;
          }
          this.cmSearchCursor.replace(e),
          this.findNext()
      }
    }

    replaceAll() { 
        var e = this,
        t = (this.cmSearchCursor = this.cmEditor.getSearchCursor(this.getQuery(), null, {
          caseFold: !0,
        }));
      this.sourceView.clearHighlights(),
        this.cmEditor.operation(function () {
          for (var n = e.replaceInputEl.value, i = t.findNext(); i; ) {
            if (typeof e.getQuery() === "object") {
              // insert any capture groups into the replacement string
              n = fillCaptureGroups(e.replaceInputEl.value, i)
            }
            t.replace(n, "searchReplace"), (i = t.findNext());
          }
        });
    }
  };
  const search = new searchClass(view, view.cmEditor, view.editorEl);
  searchObjects.set(view, search);
  return search;
}

export default class RegExSearch extends Plugin {
  onload() {
    const patchShowSearch = around(MarkdownSourceView.prototype, {
        showSearch(old) {
          return function (replace = false) { getSearch(this).show(replace) }
        },
      });
    this.register(patchShowSearch);
  }

  onunload() {
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf: WorkspaceLeaf) => {
        const view: MarkdownSourceView = (leaf.view as MarkdownView).sourceMode;
        if (view && searchObjects.has(view)) {
          searchObjects.get(view).searchContainer.detach(); // clean up DOM
          searchObjects.delete(view);
        }
    });
  }
}
