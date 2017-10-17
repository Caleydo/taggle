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
      templateResult: (item: any) => $(`<span>${dataTypeSvgIcon(item.dataType)} <span>${item.text}</span></span>`),
      templateSelection: (item: any) => $(`<span>${dataTypeSvgIcon(item.dataType)} <span>${item.text}</span></span>`),
    })
    .val(<any>null).trigger('change'); // clear selection
  }
}

/**
 *
 * Note: also change data type icons in `_taggle.scss`
 * @param {string} valueType
 * @returns {any}
 */
function dataTypeSvgIcon(valueType: string) {
  switch (valueType) {
    case 'categorical': // fa-bars
      return '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1664 1344v128q0 26-19 45t-45 19h-1408q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h1408q26 0 45 19t19 45zm0-512v128q0 26-19 45t-45 19h-1408q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h1408q26 0 45 19t19 45zm0-512v128q0 26-19 45t-45 19h-1408q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h1408q26 0 45 19t19 45z"/></svg>';
    case 'matrix': // fa-th
      return '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M512 1248v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm0-512v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm640 512v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm-640-1024v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm640 512v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm640 512v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm-640-1024v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm640 512v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68zm0-512v192q0 40-28 68t-68 28h-320q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h320q40 0 68 28t28 68z"/></svg>';
    case 'numerical': // fa-signal
      return '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path style="transform: rotate(270deg) scaleY(-1); transform-origin: 896px 896px;" d="M256 1440v192q0 14-9 23t-23 9h-192q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h192q14 0 23 9t9 23zm384-128v320q0 14-9 23t-23 9h-192q-14 0-23-9t-9-23v-320q0-14 9-23t23-9h192q14 0 23 9t9 23zm384-256v576q0 14-9 23t-23 9h-192q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h192q14 0 23 9t9 23zm384-384v960q0 14-9 23t-23 9h-192q-14 0-23-9t-9-23v-960q0-14 9-23t23-9h192q14 0 23 9t9 23zm384-512v1472q0 14-9 23t-23 9h-192q-14 0-23-9t-9-23v-1472q0-14 9-23t23-9h192q14 0 23 9t9 23z"/></svg>';
    case 'label': // fa-align-center
      return '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1792 1344v128q0 26-19 45t-45 19h-1664q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h1664q26 0 45 19t19 45zm-384-384v128q0 26-19 45t-45 19h-896q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h896q26 0 45 19t19 45zm256-384v128q0 26-19 45t-45 19h-1408q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h1408q26 0 45 19t19 45zm-384-384v128q0 26-19 45t-45 19h-640q-26 0-45-19t-19-45v-128q0-26 19-45t45-19h640q26 0 45 19t19 45z"/></svg>';
    default:
      return '';
  }
}
