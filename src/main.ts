import { Plugin, MarkdownSourceView } from "obsidian";
import { around } from "monkey-around";

declare module "obsidian" {
  interface MarkdownSourceView {
    showSearch(replace?: boolean): void;
  }
}

export default class RegExSearch extends Plugin {
  onload() {
    const plugin = this,
      patchGetQuery = around(MarkdownSourceView.prototype, {
        showSearch(old) {
          return function () {
            plugin.register(
              around(this.search.constructor.prototype, {
                getQuery(old) {
                  return function () {
                    let query = this.searchInputEl.value;
                    const isRE = query.match(/^\/(.*)\/([a-z]*)$/);
                    if (isRE) {
                      try {
                        // allow for case insensitive regex using /foo/i
                        query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i");
                      } catch (e) {} // Not a regular expression after all, fallback to default method
                    } else {
					  console.log('old call')
                      query = old.call(this);
                    }
                    return query;
                  };
                },
              })
            );
            patchGetQuery();
            return old.apply(this);
          };
        },
      });

    this.register(patchGetQuery);
  }

  onunload() {}
}
