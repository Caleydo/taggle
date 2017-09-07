import {IColumn} from 'lineupengine/src/style';
import {LeafNode, InnerNode} from '../../tree';
import {IRow} from '../../data';
import {IColumn as IDataColumn} from '../../interfaces';

export interface ITaggleColumn extends IColumn {
  readonly column: IDataColumn;
  createHeader(document: Document): HTMLElement;
  updateHeader(node: HTMLElement): void;

  filter(node: LeafNode<IRow>): boolean;

  createSingle(document: Document, row: LeafNode<IRow>, index: number): HTMLElement;
  updateSingle(node: HTMLElement, row: LeafNode<IRow>, index: number): HTMLElement;

  createGroup(document: Document, row: InnerNode, index: number): HTMLElement;
  updateGroup(node: HTMLElement, row: InnerNode, index: number): HTMLElement;
}

export default ITaggleColumn;
