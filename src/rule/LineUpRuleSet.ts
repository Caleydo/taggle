import {levelOfDetailInner, levelOfDetailLeaf} from 'taggle/src/rule/lod';
import LeafNode from 'taggle/src/tree/LeafNode';
import InnerNode from 'taggle/src/tree/InnerNode';
import {IGroupData, IGroupItem, isGroup} from 'lineupjs/src/ui/engine/interfaces';

const defaultLeafHeight = 20;
const minLeafHeight = 1;
const maxLeafHeight = 20;
const defaultAggrHeight = 40;
const paddingBottom = defaultLeafHeight + 5;


function checkHeightBoundaries(height: number, minHeight: number, maxHeight: number, _item: string) {
  let error: string|null = null;
  if(height < minHeight) {
    // printTooSmall(height, minHeight, item);
    error = `Height of some items were smaller than their minimal allowed size, limiting to minimal size`;
    height = minHeight;
  }
  if(height > maxHeight) {
    // printTooBig(height, maxHeight, item);
    error = `Height of some items were bigger than their maximal allowed size, limiting to maximal size`;
    height = maxHeight;
  }
  return {height, error};
}

export function levelOfDetail(item: IGroupData|IGroupItem, height: number): 'high'|'medium'|'low' {
  if (isGroup(item)) {
    return levelOfDetailInner(height);
  }
  return levelOfDetailLeaf(height);
}

export const regular = {
  name: 'NotSpacefillingNotProportional',
  apply: () => ({leaf: defaultLeafHeight, inner: defaultAggrHeight + GROUP_SPACING}),
  levelOfDetail
};

class SpacefillingNotProportional implements IRuleSetInstance {
  private leafHeight: number;
  private readonly spaceFillingErrors= new Set<string>();

  constructor(root: InnerNode, availableHeight: number) {
    const visibleHeight = availableHeight - paddingBottom;
    const visible = root.flatChildren();

    const inner = visible.reduce((a, b) => a + (b.type === 'inner' ? 1 : 0), 0);
    const groups = inner + visible.reduce((a, b) => a + (b.type === 'leaf' && b.meta === 'last' ? 1 : 0), 0);
    const items = visible.length - inner;

    const selected = visible.reduce((a, b) => a + (b.type === 'leaf' && b.selected ? 1 : 0), 0);
    const unselected = items - selected;

    if (unselected <= 0) {
      // doesn't matter since all are selected anyhow
      this.leafHeight = defaultLeafHeight;
      return;
    }
    const available = visibleHeight - inner * this.inner.aggregatedHeight - groups * GROUP_SPACING - selected * (defaultLeafHeight + leafMargins.high);

    const height = available / unselected;
    const guess = levelOfDetailLeaf(height);
    const heightWithMargin = height - leafMargins[guess];
    if (guess !== levelOfDetailLeaf(heightWithMargin)) {
      // below the border to next change such that it is just below the threshold
      this.leafHeight = 17.9; // TODO constant
    } else {
      this.leafHeight = heightWithMargin;
    }
  }

  readonly leaf = {
    height: (n: LeafNode<any>) => {
      if (n.selected) {
        return defaultLeafHeight;
      }
      const {height, error} = checkHeightBoundaries(this.leafHeight, minLeafHeight, maxLeafHeight, n.toString());
      if (error) {
        this.spaceFillingErrors.add(error);
      }
      return height;
    },
    visType: <'default'>'default'
  };

  readonly inner = {
    aggregatedHeight: defaultAggrHeight + GROUP_SPACING,
    visType: <'default'>'default'
  };

  get violations() {
    return {
      spaceFilling: this.spaceFillingErrors.size > 0 ? Array.from(this.spaceFillingErrors).join('\n') : undefined,
    };
  }
}

export const spacefillingNotProportional = {
  name: 'SpacefillingNotProportional',
  apply: (data: (IGroupData|IGroupItem)[], availableHeight: number, selection: Set<number>) => {

    const leaf = (item: IGroupItem) => {
      if (selection.has(item.dataIndex)) {
        return defaultLeafHeight;
      }
    }
    return {leaf, inner};
  },
  levelOfDetail
};
