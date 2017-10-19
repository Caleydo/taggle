import SidePanel, {ISidePanelOptions} from 'lineupjs/src/ui/panel/SidePanel';
import {IRankingHeaderContext} from 'lineupjs/src/ui/engine/interfaces';
import SidePanelEntry from 'lineupjs/src/ui/panel/SidePanelEntry';
import 'select2';
import * as $ from 'jquery';

export default class TaggleSidePanel extends SidePanel {

  private $select2: JQuery;

  constructor(ctx: IRankingHeaderContext, document: Document, options: Partial<ISidePanelOptions> = {}) {
    super(ctx, document, options);
  }

  protected initChooser() {
    this.node.insertAdjacentHTML('afterbegin', `<header>
        <form>
            <select></select>
        </form>
      </header>`);

    const select = <HTMLElement>this.node.querySelector('header select')!;
    this.$select2 = $(select)
      .select2()
      .on('select2:select', (e:any) => {
        const data = e.params.data;
        const entry = Array.from(this.descs.values()).find((d) => d.id === data.id)!;
        console.assert(Boolean(entry));

        const col = this.data.create(entry.desc);
        if (!col) {
          return;
        }
        this.data.getLastRanking().push(col);
        this.$select2.val(<any>null).trigger('change'); // clear selection
      });
  }

  protected updateChooser() {
    const groups = SidePanel.groupByType(Array.from(this.descs.values()));
    const data = groups.map(({key, values}: { key: string, values: SidePanelEntry[] }) => {
      return {
        text: `${key[0].toUpperCase()}${key.slice(1)}`,
        dataType: key,
        children: values.map((v) => {
          return {
            id: v.id,
            text: v.name,
            dataType: key
          };
        })
      };
    });

    this.$select2.find('optgroup').remove(); // remove old data first

    this.$select2.select2({
      placeholder: 'Add Column...',
      data,
      templateResult: (item: any) => $(`<span data-type="${item.dataType}"><span>${item.text}</span></span>`),
      templateSelection: (item: any) => $(`<span data-type="${item.dataType}"><span>${item.text}</span></span>`),
    })
    .val(<any>null).trigger('change'); // clear selection
  }
}
