import LeafNode from './LeafNode';
import InnerNode from './InnerNode';

export {default as LeafNode} from './LeafNode';
export {default as InnerNode, EAggregationType} from './InnerNode';
export {fromArray} from './utils';

export declare type INode = LeafNode<any> | InnerNode;
