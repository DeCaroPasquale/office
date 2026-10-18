// Dimensions in scene metres. Furniture and people retain their human scale.
export const OFFICE=Object.freeze({x:[-38,38],z:[-26,26],height:6.2,terrace:{x:[38,54],z:[-14,26]},terraceDoor:[8,14],walkStart:[7,21]});
export const rooms=[
 {id:'cfo',x:[9,38],z:[-26,-3]},
 {id:'riunioni',x:[-38,-17],z:[-26,-9]},
 {id:'ricerca',x:[-17,3],z:[-26,-9]},
 {id:'contabilita',x:[-38,-17],z:[-3,10]},
 {id:'consulenza',x:[-38,-17],z:[10,26]},
 {id:'operazioni',x:[-11,3],z:[3,15]},
 {id:'reception',x:[-11,3],z:[15,26]},
 {id:'lounge',x:[12,38],z:[3,26]},
 {id:'terrazza',x:[38,54],z:[-14,26]}
];
export const roomAt=(x,z)=>rooms.find(r=>x>r.x[0]&&x<r.x[1]&&z>r.z[0]&&z<r.z[1])?.id??null;
export function insideWalkBounds(x,z){const b=OFFICE,t=b.terrace;return (x>b.x[0]+.65&&x<b.x[1]-.65&&z>b.z[0]+.65&&z<b.z[1]-.65)||(x>=b.x[1]-.8&&x<t.x[1]-.65&&z>t.z[0]+.65&&z<t.z[1]-.65);}
