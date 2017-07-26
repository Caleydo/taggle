import 'file-loader?name=index.html!extract-loader!html-loader?interpolate!./index.html';
import './style.scss';
import TestRenderer from './TestRenderer';
import TreeModel from './model/TreeModel';
import CollapsibleList from './treevis/CollapsibleList';

const root = document.body.querySelector('div')!;
const treeModel = new TreeModel();

const app = new TestRenderer(root);
treeModel.addListener(app);
treeModel.addListener(new CollapsibleList(root.parentElement!));

app.run();
