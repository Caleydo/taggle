/**
 * Created by Samuel Gratzl on 18.07.2017.
 */


import {columns as rawColumns} from './AIDS_Countries.json';
import * as csv from 'raw-loader!./AIDS_Countries.csv';
import {csvParse, csvParseRows} from 'd3-dsv';
import {IColumn} from '../interfaces';

import {columns as matrixColumns} from './AIDS_matrices.json';
import * as csvLivingHIV from 'raw-loader!./AIDS_living_HIV.csv';
import * as csvLivingHIVNormalized from 'raw-loader!./AIDS_living_HIV_normalized.csv';
import * as csvNewHIVInfections from 'raw-loader!./AIDS_new_HIV_infections.csv';
import * as csvNewHIVInfectionsNormalized from 'raw-loader!./AIDS_new_HIV_infections_normalized.csv';
import * as csvOnART from 'raw-loader!./AIDS_on_ART.csv';
import * as csvOnARTNormalized from 'raw-loader!./AIDS_on_ART_normalized.csv';
import * as csvOrphans from 'raw-loader!./AIDS_orphans.csv';
import * as csvOrphansNormalized from 'raw-loader!./AIDS_orphans_normalized.csv';
import * as csvRelatedDeaths from 'raw-loader!./AIDS_related_deaths.csv';
import * as csvRelatedDeathsNormalized from 'raw-loader!./AIDS_related_deaths_normalized.csv';

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
export const data = csvParse(csv, (rawRow) => {
    const r: any = {};
    columns.forEach((col: any) => {
      const v = rawRow[col.name];
      r[col.name] = parseValue(v, col);
    });
    return r;
  });

export const defaultColumns: string[] = [
  'AIDS_Countries',
  'Continent',
  'Human devel. index',
  'Ppl knowing they have HIV (%, 2015)',
  'N. new HIV infections per 1000 ppl', // matrix
  'AIDS related deaths per 1000 ppl', // matrix
  'Discriminatory attitude scale',
  'Urban Pop (%)'
];

function integrateMatrix(desc: any, file: string) {
  //skip header and first column
  const m = csvParseRows(file).map((row, i) => i === 0 ? row.slice(1) : row.slice(1).map((v) => parseValue(v, desc))).slice(1);
  columns.push({
    value: Object.assign(desc.value, { type: 'matrix' }),
    name: desc.name,
    dataLength: desc.size[1]
  });
  data.forEach((row, i) => row[desc.name] = m[i]);
}

integrateMatrix(matrixColumns[0], csvLivingHIV);
integrateMatrix(matrixColumns[1], csvLivingHIVNormalized);
integrateMatrix(matrixColumns[2], csvNewHIVInfections);
integrateMatrix(matrixColumns[3], csvNewHIVInfectionsNormalized);
integrateMatrix(matrixColumns[4], csvRelatedDeaths);
integrateMatrix(matrixColumns[5], csvRelatedDeathsNormalized);
integrateMatrix(matrixColumns[6], csvOnART);
integrateMatrix(matrixColumns[7], csvOnARTNormalized);
integrateMatrix(matrixColumns[8], csvOrphans);
integrateMatrix(matrixColumns[9], csvOrphansNormalized);
