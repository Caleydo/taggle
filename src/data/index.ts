/**
 * Created by Samuel Gratzl on 18.07.2017.
 */


import {columns as rawColumns} from './AIDS_Countries.json';
import * as csv from 'raw-loader!./AIDS_Countries.csv';
import {csvParse} from 'd3-dsv';
import {IColumn} from '../interfaces';

function parseValue(v: string, col: { value: { type: string } }) {
  switch (col.value.type) {
    case 'real':
      return parseFloat(v);
    case 'int':
      return parseInt(v, 10);
    default:
      return v;
  }
}

export interface IRow {
  [key: string]: string | number;
}

export const columns: IColumn[] = rawColumns;

function parse(): any[] {
  return csvParse(csv, (rawRow) => {
    const r: any = {};
    columns.forEach((col: any) => {
      const v = rawRow[col.name];
      r[col.name] = parseValue(v, col);
    });
    return r;
  });
}

export const data = parse();
