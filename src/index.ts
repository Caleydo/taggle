import 'file-loader?name=index.html!extract-loader!html-loader?interpolate!./index.html';
import './style.scss';
import 'font-awesome/scss/font-awesome.scss';
import TestRenderer from './TestRenderer';

const app = new TestRenderer(document.body.querySelector('div')!);
app.run();
