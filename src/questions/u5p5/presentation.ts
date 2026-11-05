import type {PresentationPayload} from '../../contracts/presentation';
import type {SampleId} from './types';
export interface GcPresentation extends PresentationPayload {
 graphic:{viewBox:string;path1:string;path2:string;path3:string;path4:string;path5:string;path6:string;shape1:Record<string,number>;shape2:Record<string,number>;shape3:Record<string,number>;shape4:Record<string,number>;shape5:Record<string,number>;shape6:Record<string,number>;labels:Record<string,{x:number;y:number}>};
 renderer:'U5P5';formulationColours:string[];unitsPerPercent:number;initialComposition:import('./types').Composition;samples:SampleId[];dilutableSamples:SampleId[];dilution:{min:number;max:number;step:number;default:number};initialInterval:[number,number];bottle:import('./BottleDiagram').DiagramNode;sampleColours:Record<SampleId,number[]>;tickValues:number[];paragraphs:string[];sampleLabels:Record<SampleId,string>;concentrationLabels:Record<string,string>;names:string[];
 guideValues:number[];timeMax:number;maximum:number;baseline:number;step:number;words:Record<string,string>;
}
