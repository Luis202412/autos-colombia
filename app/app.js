const KEY="autos_colombia_v1";
const PAG=8;
const TIPOS_DOC=[["CC","Cédula de ciudadanía"],["CE","Cédula de extranjería"],["TI","Tarjeta de identidad"],["PA","Pasaporte"]];
const ESTADOS_C=["Disponible","Asignada","Ocupada","Mantenimiento"];

const fmtISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const hoy=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const addDias=n=>{const d=hoy();d.setDate(d.getDate()+n);return fmtISO(d)};
const parseISO=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const diasHasta=s=>Math.round((parseISO(s)-hoy())/864e5);
const fecha=s=>s?parseISO(s).toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}).replace(/\./g,""):"—";
const fechaTs=ts=>new Date(ts).toLocaleDateString("es-CO",{day:"2-digit",month:"short"}).replace(/\./g,"");
const horaTs=ts=>new Date(ts).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false});
const fechaHoraTs=ts=>`${fechaTs(ts)} · ${horaTs(ts)}`;
const dur=(a,b)=>{const m=Math.max(0,Math.round((b-a)/6e4));return m<60?`${m} min`:`${Math.floor(m/60)} h ${m%60} min`};

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=p=>String(p||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const fmtPlaca=p=>p.length>3?`${p.slice(0,3)} ${p.slice(3)}`:p;
const fmtDoc=s=>String(s).replace(/\B(?=(\d{3})+(?!\d))/g,".");
const nombre=u=>`${u.nombres} ${u.apellidos}`;
const iniciales=u=>((u.nombres[0]||"")+(u.apellidos[0]||"")).toUpperCase();
const plate=(p,l)=>`<span class="plate${l?" l":""}">${esc(fmtPlaca(p))}</span>`;
const nextId=a=>a.reduce((m,x)=>Math.max(m,x.id),0)+1;
const MEDIOS=["Efectivo","Transferencia","Tarjeta"];
const TARIFAS0={Carro:180000,Moto:80000};
const cop=n=>"$"+Math.round(n).toLocaleString("es-CO");
const fechaC=s=>fecha(s).replace(/ de /g," ");
const numRecibo=id=>"R-"+String(id).padStart(5,"0");
const addDiasISO=(iso,n)=>{const d=parseISO(iso);d.setDate(d.getDate()+n);return fmtISO(d)};
const sumaMeses=(iso,n)=>{const d=parseISO(iso),dia=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);d.setDate(Math.min(dia,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return fmtISO(d)};

let db=cargar();
const ui={
  fu:{q:"",estado:"todos",celda:"todas",veh:"todos",mens:"todas",pag:1},
  qm:"",tab:"resumen",zona:null,sel:null,form:null,formC:null,as:null,asKey:null,acc:null,
  fp:{q:"",estado:"todos",medio:"todos",per:"todos",pag:1},ptab:"pagos",pg:null,tf:null
};

function cargar(){
  try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(!d.pagos){d.pagos=[];d.tarifas={...TARIFAS0};d.tarifasHist=[]}return d}}catch(e){}
  const d=semilla();
  try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}
  return d;
}
function guardar(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}

function semilla(){
  const ahora=Date.now();
  const base={rol:"Administrador",usuarios:[],celdas:[],accesos:[]};
  const zonas=[["A","Carro",24],["B","Carro",24],["C","Moto",12]];
  zonas.forEach(([z,t,n])=>{
    for(let i=1;i<=n;i++){
      base.celdas.push({id:base.celdas.length+1,codigo:`${z}-${String(i).padStart(2,"0")}`,zona:z,tipo:t,estado:"Disponible",usuarioId:null,observaciones:"",
        historial:[{ts:ahora-864e5*500,estado:"Disponible",responsable:"Administrador",motivo:"Creación de la celda"}]});
    }
  });
  const cel=c=>base.celdas.find(x=>x.codigo===c);
  const us=[
    ["Carlos Andrés","Ramírez Ortiz","CC","1032456789","3004567821","carlos.ramirez@correo.com",[["KJT482","Carro","Mazda","Gris"]],24,"Activo","A-14"],
    ["Luisa Fernanda","Gómez Rojas","CC","52874113","3115550142","luisa.gomez@correo.com",[["HRN205","Carro","Renault","Blanco"]],39,"Activo","A-03"],
    ["Jorge Iván","Martínez Pardo","CC","79554230","3208891234","",[["MNB71D","Moto","Yamaha","Negro"]],16,"Activo","C-08"],
    ["Diana Marcela","Ospina Vélez","CC","1015998402","3017654321","diana.ospina@correo.com",[["FZP319","Carro","Chevrolet","Rojo"],["TUW58F","Moto","Honda","Azul"]],34,"Activo","A-21"],
    ["Andrés Felipe","Cárdenas Silva","CE","842119","3126667788","",[["GLX640","Carro","Kia","Plata"]],2,"Activo",null],
    ["Marta Lucía","Beltrán Cruz","CC","41760332","3001112233","",[["JPD927","Carro","Renault","Verde"]],-35,"Inactivo",null],
    ["Sebastián","Quintero Mejía","CC","1098745610","3159998877","",[["WQA15B","Moto","Suzuki","Rojo"]],29,"Activo","C-02"],
    ["Paola Andrea","Herrera Mora","CC","63221874","3042223344","",[["LDK558","Carro","Mazda","Negro"]],19,"Activo","A-10"],
    ["Hernán","Rojas Salazar","CC","80123456","3103334455","",[["BPT931","Carro","Toyota","Gris"]],12,"Activo","A-20"],
    ["Nelson","Silva Prieto","CC","79887766","3185556677","",[["SXN407","Carro","Ford","Blanco"]],3,"Activo","A-24"],
    ["Mario","Pardo Vega","CC","19345678","3016667788","",[["DKF218","Carro","Nissan","Azul"]],0,"Activo","A-06"],
    ["Santiago","Mejía Cano","CC","1020304050","3147778899","",[["RTV690","Carro","Hyundai","Gris"]],-4,"Activo","A-13"]
  ];
  us.forEach((r,i)=>{
    const [n,a,td,doc,tel,cor,veh,off,est,cc]=r;
    const u={id:i+1,nombres:n,apellidos:a,tipoDoc:td,documento:doc,telefono:tel,correo:cor,estado:est,inicio:addDias(off-30),vence:addDias(off),
      creado:ahora-864e5*400,vehiculos:veh.map(v=>({placa:v[0],tipo:v[1],marca:v[2],color:v[3]})),celdaId:null,
      historial:[{ts:ahora-864e5*400,accion:"Usuario creado",responsable:"Administrador"}]};
    if(cc){const c=cel(cc);c.estado="Asignada";c.usuarioId=u.id;u.celdaId=c.id;
      c.historial.unshift({ts:ahora-864e5*30,estado:"Asignada",responsable:"Administrador",motivo:`Asignada a ${nombre(u)}`});
      u.historial.unshift({ts:ahora-864e5*30,accion:`Celda ${cc} asignada`,responsable:"Administrador"})}
    base.usuarios.push(u);
  });
  ["A-09","A-22"].forEach(c=>{const x=cel(c);x.estado="Mantenimiento";x.historial.unshift({ts:ahora-864e5*3,estado:"Mantenimiento",responsable:"Administrador",motivo:"Reparación de piso"})});
  const dia=n=>{const d=new Date();d.setDate(d.getDate()-n);d.setHours(7,40+n,0,0);return d.getTime()};
  [1,2,3,6].forEach(n=>{const e=dia(n);base.accesos.push({id:base.accesos.length+1,placa:"KJT482",usuarioId:1,celdaId:cel("A-14").id,entrada:e,salida:e+(10*60+25+n)*6e4})});
  [["HRN205",2,"A-03",3*36e5],["BPT931",9,"A-20",2*36e5]].forEach(([p,uid,c,off])=>{
    const x=cel(c);x.estado="Ocupada";
    x.historial.unshift({ts:ahora-off,estado:"Ocupada",responsable:"Operador",motivo:`Ingreso de ${fmtPlaca(p)}`});
    base.accesos.push({id:base.accesos.length+1,placa:p,usuarioId:uid,celdaId:x.id,entrada:ahora-off,salida:null});
  });
  base.pagos=[];base.tarifas={...TARIFAS0};
  base.tarifasHist=[{ts:ahora-864e5*200,responsable:"Administrador",tipo:"Carro",antes:170000,despues:180000},{ts:ahora-864e5*200,responsable:"Administrador",tipo:"Moto",antes:75000,despues:80000}];
  const items=[];
  base.usuarios.forEach((u,i)=>{
    const c=u.celdaId?base.celdas.find(x=>x.id===u.celdaId):null;
    const tipo=c?c.tipo:u.vehiculos[0].tipo;
    const mk=(desde,hasta,venceAnt,inicioAnt,ts,extra={})=>items.push({u,tipo,desde,hasta,venceAnt,inicioAnt,ts,...extra});
    if(i<9){const d0=sumaMeses(u.inicio,-1);mk(d0,u.inicio,d0,sumaMeses(d0,-1),parseISO(d0).getTime()+9*36e5,i===2?{anulado:true}:{})}
    const tsAct=(i===7||i===8)?ahora-(i===7?3:2)*36e5:Math.min(parseISO(u.inicio).getTime()+9*36e5,ahora-864e5*(1+i%4)-i*17*6e4);
    mk(u.inicio,u.vence,u.inicio,sumaMeses(u.inicio,-1),tsAct);
  });
  items.sort((a,b)=>a.ts-b.ts).forEach(it=>{
    const id=base.pagos.length+1,meses=Math.max(1,Math.round((parseISO(it.hasta)-parseISO(it.desde))/(30*864e5)));
    const valor=base.tarifas[it.tipo]*meses,medio=MEDIOS[[0,1,0,2][id%4]];
    const rec=medio==="Efectivo"?Math.ceil(valor/50000)*50000:valor;
    base.pagos.push({id,usuarioId:it.u.id,desde:it.desde,hasta:it.hasta,meses,valor,tipo:it.tipo,medio,
      referencia:medio==="Efectivo"?"":(medio==="Tarjeta"?"AUT":"TRF")+String(480000+id*137).slice(0,6),recibido:rec,cambio:rec-valor,ts:it.ts,
      responsable:id%3===0?"Administrador":"Operador",estado:it.anulado?"Anulado":"Aplicado",venceAnt:it.venceAnt,inicioAnt:it.inicioAnt,
      anulacion:it.anulado?{ts:it.ts+36e5,responsable:"Administrador",motivo:"Cobro registrado dos veces por error"}:null});
  });
  return base;
}

const userById=id=>db.usuarios.find(u=>u.id===id);
const celdaById=id=>db.celdas.find(c=>c.id===id);
const admin=()=>db.rol==="Administrador";
const vigente=u=>u.estado==="Activo"&&diasHasta(u.vence)>=0;
const logC=(c,estado,motivo)=>c.historial.unshift({ts:Date.now(),estado,responsable:db.rol,motivo});
const logU=(u,accion)=>u.historial.unshift({ts:Date.now(),accion,responsable:db.rol});
const abiertoDe=p=>db.accesos.find(a=>a.placa===p&&!a.salida);
const zonas=()=>[...new Set(db.celdas.map(c=>c.zona))].sort();
const ordenCodigo=(a,b)=>a.codigo.localeCompare(b.codigo,undefined,{numeric:true});

const reDocs=/^\d{5,15}$/;
const reNombre=/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{2,60}$/;
const reCorreo=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const placaOk=(p,t)=>t==="Moto"?/^[A-Z]{3}\d{2}[A-Z]$/.test(p):/^[A-Z]{3}\d{3}$/.test(p);

function validarUsuario(f){
  const d=f.d,e={},id=f.id;
  const doc=d.documento.replace(/[.\s]/g,"");
  if(!doc)e.documento="Obligatorio";
  else if(!reDocs.test(doc))e.documento="Solo números, entre 5 y 15 dígitos";
  else if(db.usuarios.some(u=>u.id!==id&&u.tipoDoc===d.tipoDoc&&u.documento===doc))e.documento="Este documento ya está registrado";
  const tel=d.telefono.replace(/\s/g,"");
  if(!tel)e.telefono="Obligatorio";else if(!/^\d{7,10}$/.test(tel))e.telefono="Debe tener entre 7 y 10 dígitos";
  if(!reNombre.test(d.nombres.trim()))e.nombres="Obligatorio, solo letras";
  if(!reNombre.test(d.apellidos.trim()))e.apellidos="Obligatorio, solo letras";
  if(d.correo.trim()&&!reCorreo.test(d.correo.trim()))e.correo="Formato de correo no válido";
  if(!d.inicio)e.inicio="Obligatorio";
  if(!d.vence)e.vence="Obligatorio";else if(d.inicio&&d.vence<d.inicio)e.vence="Debe ser posterior al inicio";
  const vistas=new Set();
  f.veh.forEach((v,i)=>{
    const p=norm(v.placa);
    if(!p)e[`v${i}placa`]="Obligatoria";
    else if(!placaOk(p,v.tipo))e[`v${i}placa`]=v.tipo==="Moto"?"Formato de moto: ABC12D":"Formato de carro: ABC123";
    else if(vistas.has(p))e[`v${i}placa`]="Placa repetida en el formulario";
    else if(db.usuarios.some(u=>u.id!==id&&u.vehiculos.some(x=>x.placa===p)))e[`v${i}placa`]="Placa ya registrada a otro usuario";
    vistas.add(p);
  });
  if(!f.veh.length)e.vehiculos="Registra al menos un vehículo";
  if(id){
    const u=userById(id);
    const placas=f.veh.map(v=>norm(v.placa));
    u.vehiculos.forEach(v=>{if(!placas.includes(v.placa)&&abiertoDe(v.placa))e.vehiculos=`No se puede quitar ${fmtPlaca(v.placa)}: está dentro del parqueadero`});
    if(u.celdaId&&!e.vehiculos){
      const c=celdaById(u.celdaId);
      if(!f.veh.some(v=>v.tipo===c.tipo))e.vehiculos=`El usuario tiene la celda ${c.codigo} (${c.tipo}); conserva un vehículo de ese tipo o libera la celda`;
    }
  }
  return e;
}

function guardarUsuario(){
  leerFormU();
  const f=ui.form;
  f.err=validarUsuario(f);
  if(Object.keys(f.err).length){render();const x=$(".fe");if(x)x.scrollIntoView({block:"center"});return}
  const d=f.d;
  const datos={tipoDoc:d.tipoDoc,documento:d.documento.replace(/[.\s]/g,""),telefono:d.telefono.replace(/\s/g,""),nombres:d.nombres.trim(),apellidos:d.apellidos.trim(),
    correo:d.correo.trim(),inicio:d.inicio,vence:d.vence,vehiculos:f.veh.map(v=>({placa:norm(v.placa),tipo:v.tipo,marca:v.marca.trim(),color:v.color.trim()}))};
  let u;
  if(f.id){u=userById(f.id);Object.assign(u,datos);logU(u,"Datos actualizados")}
  else{u={id:nextId(db.usuarios),...datos,estado:"Activo",celdaId:null,creado:Date.now(),historial:[]};logU(u,"Usuario creado");db.usuarios.push(u)}
  guardar();
  ui.form=null;
  toast(f.id?"Cambios guardados":"Usuario registrado");
  location.hash=`#/usuarios/${u.id}`;
}

function cambiarEstadoUsuario(u){
  if(u.estado==="Activo"){
    if(u.celdaId){
      const c=celdaById(u.celdaId);
      if(c.estado==="Ocupada")return"No se puede inactivar: su vehículo está dentro del parqueadero";
      c.estado="Disponible";c.usuarioId=null;logC(c,"Disponible",`Liberada por inactivación de ${nombre(u)}`);u.celdaId=null;
    }
    u.estado="Inactivo";logU(u,"Usuario inactivado");
  }else{u.estado="Activo";logU(u,"Usuario activado")}
  guardar();return null;
}

function asignar(uId,placa,cId){
  const u=userById(uId),c=celdaById(cId),v=u&&u.vehiculos.find(x=>x.placa===placa);
  if(!u||!c||!v)return"Completa usuario, vehículo y celda";
  if(u.estado!=="Activo")return"El usuario está inactivo";
  if(diasHasta(u.vence)<0)return"La mensualidad del usuario está vencida";
  if(c.estado!=="Disponible")return"La celda no está disponible";
  if(c.tipo!==v.tipo)return"La celda no es compatible con el tipo de vehículo";
  if(u.celdaId){
    const a=celdaById(u.celdaId);
    if(a.estado==="Ocupada")return"El vehículo del usuario está dentro; no se puede cambiar su celda";
    a.estado="Disponible";a.usuarioId=null;logC(a,"Disponible","Cambio de celda");
  }
  c.estado="Asignada";c.usuarioId=u.id;u.celdaId=c.id;
  logC(c,"Asignada",`Asignada a ${nombre(u)}`);logU(u,`Celda ${c.codigo} asignada`);
  guardar();return null;
}

function liberar(cId){
  const c=celdaById(cId);
  if(c.estado==="Ocupada")return"La celda está ocupada: el vehículo sigue dentro";
  if(c.estado!=="Asignada")return"La celda no está asignada";
  const u=userById(c.usuarioId);
  if(u){u.celdaId=null;logU(u,`Celda ${c.codigo} liberada`)}
  c.estado="Disponible";c.usuarioId=null;logC(c,"Disponible","Celda liberada");
  guardar();return null;
}

function mantenimiento(cId,motivo){
  const c=celdaById(cId);
  if(motivo.trim().length<3)return"Escribe el motivo del mantenimiento";
  if(c.estado==="Ocupada")return"No se puede deshabilitar una celda ocupada";
  if(c.estado==="Mantenimiento")return"La celda ya está en mantenimiento";
  if(c.estado==="Asignada"){const u=userById(c.usuarioId);if(u){u.celdaId=null;logU(u,`Celda ${c.codigo} liberada por mantenimiento`)}}
  c.estado="Mantenimiento";c.usuarioId=null;logC(c,"Mantenimiento",motivo.trim());
  guardar();return null;
}

function habilitar(cId){
  const c=celdaById(cId);
  if(c.estado!=="Mantenimiento")return"La celda no está en mantenimiento";
  c.estado="Disponible";logC(c,"Disponible","Fin de mantenimiento");
  guardar();return null;
}

function validarCelda(f){
  const d=f.d,e={};
  const cod=d.codigo.trim().toUpperCase();
  if(!/^[A-Z]{1,2}-\d{1,3}$/.test(cod))e.codigo="Formato: A-01";
  else if(db.celdas.some(c=>c.id!==f.id&&c.codigo===cod))e.codigo="El código ya existe";
  if(!/^[A-Z]{1,2}$/.test(d.zona.trim().toUpperCase()))e.zona="Una o dos letras, por ejemplo A";
  if(!["Carro","Moto"].includes(d.tipo))e.tipo="Obligatorio";
  if(f.id){
    const c=celdaById(f.id);
    if(c.tipo!==d.tipo&&(c.estado==="Asignada"||c.estado==="Ocupada"))e.tipo="No se puede cambiar el tipo de una celda asignada u ocupada";
  }
  return e;
}

function guardarCelda(){
  leerFormC();
  const f=ui.formC;
  f.err=validarCelda(f);
  if(Object.keys(f.err).length){render();return}
  const d=f.d;
  const datos={codigo:d.codigo.trim().toUpperCase(),zona:d.zona.trim().toUpperCase(),tipo:d.tipo,observaciones:d.observaciones.trim()};
  let c;
  if(f.id){c=celdaById(f.id);const cambio=c.codigo!==datos.codigo;Object.assign(c,datos);logC(c,c.estado,cambio?"Datos y código actualizados":"Datos actualizados")}
  else{c={id:nextId(db.celdas),...datos,estado:"Disponible",usuarioId:null,historial:[]};logC(c,"Disponible","Creación de la celda");db.celdas.push(c)}
  guardar();
  ui.formC=null;ui.zona=c.zona;ui.sel=c.id;
  toast(f.id?"Celda actualizada":"Celda creada");
  location.hash="#/celdas";
}

function entrada(placa){
  const p=norm(placa);
  if(!p)return{ok:false,msg:"Escribe una placa"};
  const u=db.usuarios.find(x=>x.vehiculos.some(v=>v.placa===p));
  if(!u)return{ok:false,msg:`La placa ${fmtPlaca(p)} no está registrada`};
  if(u.estado!=="Activo")return{ok:false,msg:`Acceso denegado: ${nombre(u)} está inactivo`};
  if(diasHasta(u.vence)<0)return{ok:false,msg:`Acceso denegado: la mensualidad de ${nombre(u)} está vencida`};
  if(abiertoDe(p))return{ok:false,msg:`El vehículo ${fmtPlaca(p)} ya está dentro del parqueadero`};
  const c=u.celdaId&&celdaById(u.celdaId);
  if(!c)return{ok:false,msg:`Acceso denegado: ${nombre(u)} no tiene celda asignada`};
  const v=u.vehiculos.find(x=>x.placa===p);
  if(c.tipo!==v.tipo)return{ok:false,msg:`Acceso denegado: el vehículo no es compatible con la celda ${c.codigo}`};
  if(c.estado!=="Asignada")return{ok:false,msg:`Acceso denegado: la celda ${c.codigo} no está disponible`};
  c.estado="Ocupada";logC(c,"Ocupada",`Ingreso de ${fmtPlaca(p)}`);
  db.accesos.push({id:nextId(db.accesos),placa:p,usuarioId:u.id,celdaId:c.id,entrada:Date.now(),salida:null});
  guardar();
  return{ok:true,msg:`Entrada registrada: ${fmtPlaca(p)} · celda ${c.codigo} · ${nombre(u)}`};
}

function salida(placa){
  const p=norm(placa);
  if(!p)return{ok:false,msg:"Escribe una placa"};
  const a=abiertoDe(p);
  if(!a)return{ok:false,msg:`El vehículo ${fmtPlaca(p)} no tiene una entrada abierta`};
  a.salida=Date.now();
  const c=celdaById(a.celdaId);
  if(c&&c.estado==="Ocupada"){c.estado=c.usuarioId?"Asignada":"Disponible";logC(c,c.estado,`Salida de ${fmtPlaca(p)}`)}
  guardar();
  return{ok:true,msg:`Salida registrada: ${fmtPlaca(p)} · permanencia ${dur(a.entrada,a.salida)}`};
}

function shell(act,cuerpo){
  const tabs=[["acceso","Entradas y salidas"],["usuarios","Usuarios"],["celdas","Celdas"],["pagos","Pagos"]]
    .map(([k,t])=>`<a class="${k===act?"on":""}" href="#/${k}">${t}</a>`).join("");
  return `<div class="bar"><span class="word">AUTOS COLOMBIA</span><nav class="tabs">${tabs}</nav>
  <div class="user"><label>Rol <select data-change="rol"><option${admin()?" selected":""}>Administrador</option><option${admin()?"":" selected"}>Operador</option></select></label>
  <button class="lnk" data-act="reset">Restablecer datos</button></div></div>${cuerpo}`;
}
const pagina=c=>`<main class="page">${c}</main>`;
const sinPermiso=act=>shell(act,pagina(`<div class="title"><div><h1>Sin permiso</h1><div class="sub">Esta acción solo está disponible para el rol Administrador.</div></div></div>`));

function lotHTML(cs,o={}){
  const arr=[...cs].sort(ordenCodigo);
  const m=Math.ceil(arr.length/2);
  const fila=(xs,cls)=>`<div class="row ${cls}">${xs.map(c=>bayHTML(c,o)).join("")}</div>`;
  return `<div class="lot">${fila(arr.slice(0,m),"t")}<div class="aisle"><span>ENTRADA ▶</span><span>◀ SALIDA</span></div>${fila(arr.slice(m),"b")}</div>`;
}
function bayHTML(c,o){
  const u=c.usuarioId?userById(c.usuarioId):null;
  let inner="";
  if(c.estado==="Asignada"&&u)inner=`<span class="ow">${esc(iniciales(u))}</span>`;
  if(c.estado==="Ocupada")inner='<div class="car"></div>';
  const dim=o.dim&&c.estado!=="Disponible";
  const act=dim?"":` data-act="${o.act}" data-id="${c.id}"`;
  return `<div class="bay ${c.estado[0]}${o.sel===c.id?" sel":""}${dim?" dim":""}"${act} title="${esc(c.codigo)} · ${c.estado}"><span class="c">${esc(c.codigo)}</span>${inner}</div>`;
}
const legendHTML=()=>`<div class="legend"><span><i class="sw D"></i>Disponible</span><span><i class="sw A"></i>Asignada (iniciales del usuario)</span><span><i class="sw O"></i>Ocupada</span><span><i class="sw M"></i>Mantenimiento</span></div>`;

function filtrarU(){
  const f=ui.fu,q=f.q.trim().toLowerCase();
  return db.usuarios.filter(u=>{
    if(q){const h=[nombre(u),u.documento,fmtDoc(u.documento),...u.vehiculos.map(v=>v.placa)].join(" ").toLowerCase();if(!h.includes(q.replace(/\s+/g," ")))return false}
    if(f.estado!=="todos"&&u.estado!==f.estado)return false;
    if(f.celda==="con"&&!u.celdaId)return false;
    if(f.celda==="sin"&&u.celdaId)return false;
    if(f.veh!=="todos"&&!u.vehiculos.some(v=>v.tipo===f.veh))return false;
    const d=diasHasta(u.vence);
    if(f.mens==="vigente"&&d<0)return false;
    if(f.mens==="porvencer"&&!(d>=0&&d<=3))return false;
    if(f.mens==="vencida"&&d>=0)return false;
    return true;
  }).sort((a,b)=>nombre(a).localeCompare(nombre(b)));
}

function flagMens(u){
  const d=diasHasta(u.vence);
  if(d<0)return' <small style="font-weight:700;color:#111">· vencida</small>';
  if(d<=3)return' <small style="font-weight:700;color:#111">· por vencer</small>';
  return"";
}

function tablaU(){
  const f=ui.fu,lista=filtrarU();
  const pags=Math.max(1,Math.ceil(lista.length/PAG));
  if(f.pag>pags)f.pag=pags;
  const ini=(f.pag-1)*PAG,vis=lista.slice(ini,ini+PAG);
  const filas=vis.map(u=>{
    const c=u.celdaId?celdaById(u.celdaId):null;
    return `<tr data-href="#/usuarios/${u.id}"><td style="width:300px"><b>${esc(nombre(u))}</b><small class="mono">${u.tipoDoc} ${fmtDoc(u.documento)}</small></td>
    <td>${u.vehiculos.map(v=>plate(v.placa)).join(" ")}</td><td class="code">${c?esc(c.codigo):"—"}</td>
    <td>${fecha(u.vence)}${flagMens(u)}</td><td><span class="st${u.estado==="Inactivo"?" no":""}">${u.estado}</span></td></tr>`;
  }).join("");
  const nums=Array.from({length:pags},(_,i)=>`<button class="${i+1===f.pag?"on":""}" data-act="pag" data-n="${i+1}">${i+1}</button>`).join("");
  return `<table><thead><tr><th>Nombre y documento</th><th>Placas</th><th>Celda</th><th>Mensualidad vence</th><th>Estado</th></tr></thead>
  <tbody>${filas||`<tr><td colspan="5" class="empty">No hay usuarios que coincidan con la búsqueda.</td></tr>`}</tbody></table>
  <div class="pag"><span>${lista.length?`Mostrando ${ini+1}–${ini+vis.length} de ${lista.length}`:"Sin resultados"}</span><div>${nums}</div></div>`;
}

function vistaUsuarios(){
  const f=ui.fu,us=db.usuarios;
  const n=fn=>us.filter(fn).length;
  const rad=(k,v,t,c)=>`<label class="chk"><input type="radio" name="f_${k}" value="${v}" data-change="filtro" data-k="${k}"${f[k]===v?" checked":""}>${t}<em>${c}</em></label>`;
  const rail=`<input class="inp" id="f_q" placeholder="Nombre, documento o placa" value="${esc(f.q)}" data-input="buscarU" style="margin-bottom:22px">
  <div class="grp"><span class="lbl">Estado</span>${rad("estado","todos","Todos",us.length)}${rad("estado","Activo","Activos",n(u=>u.estado==="Activo"))}${rad("estado","Inactivo","Inactivos",n(u=>u.estado==="Inactivo"))}</div>
  <div class="grp"><span class="lbl">Celda</span>${rad("celda","todas","Todas",us.length)}${rad("celda","con","Con celda",n(u=>u.celdaId))}${rad("celda","sin","Sin celda",n(u=>!u.celdaId))}</div>
  <div class="grp"><span class="lbl">Vehículo</span>${rad("veh","todos","Todos",us.length)}${rad("veh","Carro","Carro",n(u=>u.vehiculos.some(v=>v.tipo==="Carro")))}${rad("veh","Moto","Moto",n(u=>u.vehiculos.some(v=>v.tipo==="Moto")))}</div>
  <div class="grp"><span class="lbl">Mensualidad</span>${rad("mens","todas","Todas",us.length)}${rad("mens","vigente","Vigente",n(u=>diasHasta(u.vence)>=0))}${rad("mens","porvencer","Por vencer (3 días)",n(u=>{const d=diasHasta(u.vence);return d>=0&&d<=3}))}${rad("mens","vencida","Vencida",n(u=>diasHasta(u.vence)<0))}</div>`;
  return shell("usuarios",pagina(`<div class="title"><div><div class="crumb">Usuarios</div><h1>Usuarios</h1>
  <div class="sub">${us.length} registrados · ${n(vigente)} con mensualidad vigente</div></div>
  ${admin()?'<a class="btn p" href="#/usuarios/nuevo">+ Nuevo usuario</a>':""}</div>
  <div class="split"><aside>${rail}</aside><section id="tabla">${tablaU()}</section></div>`));
}

function listaMaestro(act){
  const q=ui.qm.trim().toLowerCase();
  return db.usuarios.filter(u=>!q||[nombre(u),u.documento,...u.vehiculos.map(v=>v.placa)].join(" ").toLowerCase().includes(q))
    .sort((a,b)=>nombre(a).localeCompare(nombre(b)))
    .map(u=>{const c=u.celdaId?celdaById(u.celdaId):null;
      return `<a class="it${u.id===act?" on":""}" href="#/usuarios/${u.id}"><b>${esc(nombre(u))}</b><small class="mono">${u.vehiculos.map(v=>fmtPlaca(v.placa)).join(", ")} · ${c?esc(c.codigo):u.estado==="Inactivo"?"inactivo":"sin celda"}</small></a>`}).join("");
}

function vistaDetalle(id){
  const u=userById(id);
  if(!u)return shell("usuarios",pagina(`<div class="title"><div><h1>Usuario no encontrado</h1><div class="sub"><a href="#/usuarios" style="text-decoration:underline">Volver al listado</a></div></div></div>`));
  const c=u.celdaId?celdaById(u.celdaId):null;
  const tot=Math.max(1,Math.round((parseISO(u.vence)-parseISO(u.inicio))/864e5));
  const pas=Math.round((hoy()-parseISO(u.inicio))/864e5);
  const pct=Math.min(100,Math.max(0,pas/tot*100));
  const d=diasHasta(u.vence);
  const txtVence=d<0?`Venció hace ${-d} días`:d===0?"Vence hoy":`Vence ${fecha(u.vence)} · quedan ${d} días`;
  const accs=db.accesos.filter(a=>a.usuarioId===u.id).sort((a,b)=>b.entrada-a.entrada);
  const tabs=[["resumen","Resumen"],["vehiculos","Vehículos"],["accesos","Accesos"],["pagos","Pagos"],["cambios","Historial de cambios"]]
    .map(([k,t])=>`<a class="${ui.tab===k?"on":""}" data-act="tab" data-k="${k}">${t}</a>`).join("");
  let cuerpo="";
  if(ui.tab==="resumen"){
    const accion=c
      ?(admin()?`<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">${c.estado==="Asignada"?`<button class="btn s" data-act="liberarU" data-id="${c.id}">Liberar celda</button>`:""}<a class="btn s g" href="#/asignar/${u.id}">Cambiar celda</a></div>`:"")
      :(admin()&&vigente(u)?`<div style="margin-top:16px"><a class="btn s" href="#/asignar/${u.id}">Asignar celda</a></div>`:"");
    const celdaBox=`<div class="box"><div class="h"><span class="lbl" style="margin:0">Celda asignada</span>${c?`<span class="st" style="font-size:12.5px">${c.estado}${c.estado==="Asignada"?" · vehículo fuera":" · vehículo dentro"}</span>`:""}</div><div class="p">
    ${c?`<div style="display:flex;align-items:baseline;gap:12px"><span class="code" style="font-size:42px;letter-spacing:-.03em;line-height:1">${esc(c.codigo)}</span><span style="color:var(--mute)">Zona ${esc(c.zona)} · ${c.tipo}s</span></div>`:`<div style="color:var(--mute)">Sin celda asignada</div>`}${accion}</div></div>`;
    cuerpo=`<div class="grid2" style="gap:26px;margin-bottom:22px"><div>
    <span class="lbl" style="margin-bottom:10px">Datos de contacto</span>
    <div class="kv"><span>Teléfono</span><b>${esc(u.telefono)}</b><span>Correo</span><b>${esc(u.correo||"—")}</b><span>Vehículos</span><b>${u.vehiculos.map(v=>plate(v.placa)).join(" ")}</b></div>
    <span class="lbl" style="margin:20px 0 10px">Mensualidad</span>
    <div class="bar-m"><div class="tr"><i style="width:${pct}%"></i></div><div class="hoy" style="left:${pct}%">hoy ▾</div></div>
    <div style="display:flex;justify-content:space-between;color:var(--mute);font-size:12px"><span>${fecha(u.inicio)}</span><span>${txtVence}</span></div></div>${celdaBox}</div>
    <span class="lbl">Últimos accesos</span>${tablaAccesos(accs.slice(0,5),false)}`;
  }else if(ui.tab==="vehiculos"){
    cuerpo=`<table><thead><tr><th>Placa</th><th>Tipo</th><th>Marca</th><th>Color</th><th>Estado</th></tr></thead><tbody>${u.vehiculos.map(v=>`<tr><td>${plate(v.placa)}</td><td>${v.tipo}</td><td>${esc(v.marca||"—")}</td><td>${esc(v.color||"—")}</td><td>${abiertoDe(v.placa)?"Dentro del parqueadero":"Fuera"}</td></tr>`).join("")}</tbody></table>`;
  }else if(ui.tab==="accesos"){
    cuerpo=accs.length?tablaAccesos(accs,false):`<div class="empty">Este usuario aún no tiene accesos.</div>`;
  }else if(ui.tab==="pagos"){
    cuerpo=pagosDeUsuario(u);
  }else{
    cuerpo=`<table><thead><tr><th>Fecha</th><th>Cambio</th><th>Responsable</th></tr></thead><tbody>${u.historial.map(h=>`<tr><td class="mono">${fechaHoraTs(h.ts)}</td><td>${esc(h.accion)}</td><td>${esc(h.responsable)}</td></tr>`).join("")}</tbody></table>`;
  }
  const cobrar=u.estado==="Activo"?`<a class="btn s" href="#/pagos/nuevo/${u.id}">Registrar pago</a>`:"";
  const btns=`<div style="display:flex;gap:8px">${cobrar}${admin()?`<a class="btn s g" href="#/usuarios/${u.id}/editar">Editar datos</a><button class="btn s g" data-act="estadoU" data-id="${u.id}">${u.estado==="Activo"?"Inactivar":"Activar"}</button>`:""}</div>`;
  return shell("usuarios",`<div class="master"><aside><div style="padding:0 14px 14px"><input class="inp" style="height:34px" placeholder="Buscar usuario" value="${esc(ui.qm)}" data-input="buscarM"></div><div id="maestro">${listaMaestro(u.id)}</div></aside>
  <div class="det"><div class="crumb"><a href="#/usuarios">Usuarios</a> / ${esc(nombre(u))}</div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:12px;flex-wrap:wrap"><div><h1>${esc(nombre(u))}</h1>
  <div class="sub"><span class="st${u.estado==="Inactivo"?" no":""}">${u.estado}</span> &nbsp;·&nbsp; <span class="mono">${u.tipoDoc} ${fmtDoc(u.documento)}</span> &nbsp;·&nbsp; desde ${fecha(fmtISO(new Date(u.creado)))}</div></div>${btns}</div>
  <div class="tabs2">${tabs}</div>${cuerpo}</div></div>`);
}

function tablaAccesos(lista,conUsuario){
  if(!lista.length)return `<div class="empty">Sin accesos registrados.</div>`;
  return `<table><thead><tr><th>Fecha</th><th>Placa</th>${conUsuario?"<th>Usuario</th>":""}<th>Celda</th><th>Entrada</th><th>Salida</th><th>Permanencia</th></tr></thead><tbody>${lista.map(a=>{
    const c=celdaById(a.celdaId),u=userById(a.usuarioId);
    return `<tr><td>${fechaTs(a.entrada)}</td><td>${plate(a.placa)}</td>${conUsuario?`<td>${u?esc(nombre(u)):"—"}</td>`:""}<td class="code">${c?esc(c.codigo):"—"}</td><td class="mono">${horaTs(a.entrada)}</td><td class="mono">${a.salida?horaTs(a.salida):"dentro"}</td><td>${a.salida?dur(a.entrada,a.salida):"—"}</td></tr>`}).join("")}</tbody></table>`;
}

function iniciarForm(id){
  const key=location.hash;
  if(id){
    const u=userById(id);
    ui.form={key,id,err:{},d:{tipoDoc:u.tipoDoc,documento:u.documento,telefono:u.telefono,nombres:u.nombres,apellidos:u.apellidos,correo:u.correo,inicio:u.inicio,vence:u.vence},veh:u.vehiculos.map(v=>({...v}))};
  }else{
    ui.form={key,id:null,err:{},d:{tipoDoc:"CC",documento:"",telefono:"",nombres:"",apellidos:"",correo:"",inicio:fmtISO(hoy()),vence:addDias(30)},veh:[{placa:"",tipo:"Carro",marca:"",color:""}]};
  }
}
function leerFormU(){
  const f=ui.form,g=id=>{const e=document.getElementById(id);return e?e.value:""};
  f.d={tipoDoc:g("f_tipoDoc"),documento:g("f_documento"),telefono:g("f_telefono"),nombres:g("f_nombres"),apellidos:g("f_apellidos"),correo:g("f_correo"),inicio:g("f_inicio"),vence:g("f_vence")};
  f.veh=f.veh.map((_,i)=>({placa:g(`v${i}_placa`),tipo:g(`v${i}_tipo`)||"Carro",marca:g(`v${i}_marca`),color:g(`v${i}_color`)}));
}

function vistaFormU(id){
  if(!admin())return sinPermiso("usuarios");
  if(id&&!userById(id))return vistaDetalle(id);
  if(!ui.form||ui.form.key!==location.hash)iniciarForm(id);
  const f=ui.form,d=f.d,e=f.err;
  const fe=k=>e[k]?`<div class="hint e fe">▲ ${esc(e[k])}</div>`:"";
  const inp=(k,label,tipo="text",extra="")=>`<div><span class="lbl">${label}</span><input class="inp${e[k]?" err":""}" id="f_${k}" type="${tipo}" value="${esc(d[k])}" ${extra}>${fe(k)}</div>`;
  const vr=f.veh.map((v,i)=>`<div class="vrow"><div><span class="lbl">Placa *</span><input class="inp${e[`v${i}placa`]?" err":""}" id="v${i}_placa" value="${esc(v.placa)}" maxlength="7" data-input="placa" data-i="${i}" style="text-transform:uppercase">${fe(`v${i}placa`)}
    <div class="pv" id="pv${i}">${norm(v.placa)?plate(norm(v.placa)):""}</div></div>
    <div><span class="lbl">Tipo *</span><select class="inp" id="v${i}_tipo" data-change="tipoveh"><option${v.tipo==="Carro"?" selected":""}>Carro</option><option${v.tipo==="Moto"?" selected":""}>Moto</option></select></div>
    <div><span class="lbl">Marca</span><input class="inp" id="v${i}_marca" value="${esc(v.marca)}"></div>
    <div><span class="lbl">Color</span><input class="inp" id="v${i}_color" value="${esc(v.color)}"></div>
    <div>${f.veh.length>1?`<span class="lbl">&nbsp;</span><button class="btn s g" data-act="quitarV" data-i="${i}" type="button">Quitar</button>`:""}</div></div>`).join("");
  const docOpts=TIPOS_DOC.map(([k,t])=>`<option value="${k}"${d.tipoDoc===k?" selected":""}>${t}</option>`).join("");
  return shell("usuarios",pagina(`<div class="title"><div><div class="crumb"><a href="#/usuarios">Usuarios</a> / ${id?"Editar":"Nuevo"}</div><h1>${id?"Editar usuario":"Nuevo usuario"}</h1></div></div>
  <div class="stack" style="max-width:980px">
  <section><h2>1. Datos del titular</h2><div class="stack" style="gap:16px">
  <div class="grid3"><div><span class="lbl">Tipo de documento *</span><select class="inp" id="f_tipoDoc">${docOpts}</select></div>${inp("documento","Número *","text",'inputmode="numeric"')}${inp("telefono","Teléfono *","tel")}</div>
  <div class="grid3">${inp("nombres","Nombres *")}${inp("apellidos","Apellidos *")}${inp("correo","Correo electrónico","email")}</div></div></section>
  <section><h2>2. Vehículos</h2>${vr}${fe("vehiculos")}<div style="margin-top:12px"><button class="btn s g" data-act="agregarV" type="button">+ Agregar otro vehículo</button></div></section>
  <section><h2>3. Mensualidad</h2><div class="grid3">${inp("inicio","Fecha de inicio *","date")}${inp("vence","Vence *","date")}<div></div></div></section></div>
  <div class="foot"><span class="hint" style="margin:0">* Campos obligatorios</span><div class="acts"><a class="btn g" href="${id?`#/usuarios/${id}`:"#/usuarios"}">Cancelar</a><button class="btn p" data-act="guardarU">${id?"Guardar cambios":"Guardar usuario"}</button></div></div>`));
}

function vistaCeldas(){
  const zs=zonas();
  if(!ui.zona||!zs.includes(ui.zona))ui.zona=zs[0];
  const tot=db.celdas.length;
  const cnt=e=>db.celdas.filter(c=>c.estado===e).length;
  const [d,a,o,m]=ESTADOS_C.map(cnt);
  const pc=n=>(tot?n/tot*100:0);
  const meter=`<div class="meter"><i style="width:${pc(o)}%;background:#1b1b1b"></i><i style="width:${pc(a)}%;background:#cdcdc8;border-left:1.5px solid #111;border-right:1.5px solid #111"></i><i style="width:${pc(d)}%;background:#fff"></i><i style="width:${pc(m)}%;background:repeating-linear-gradient(45deg,#777 0 2px,#fff 2px 5px);border-left:1.5px solid #111"></i></div>`;
  const tabs=zs.map(z=>{const t=db.celdas.find(c=>c.zona===z).tipo;return `<a class="${z===ui.zona?"on":""}" data-act="zona" data-z="${z}">Zona ${z} · ${t}s</a>`}).join("");
  const cs=db.celdas.filter(c=>c.zona===ui.zona);
  const sel=ui.sel?celdaById(ui.sel):null;
  const selok=sel&&sel.zona===ui.zona?sel:null;
  let panel=`<div class="box"><div class="h"><span class="lbl" style="margin:0">Celda seleccionada</span></div><div class="p" style="color:var(--mute)">Selecciona una celda del mapa para ver su detalle.</div></div>`;
  if(selok){
    const u=selok.usuarioId?userById(selok.usuarioId):null;
    const ult=db.accesos.filter(x=>x.celdaId===selok.id).sort((x,y)=>y.entrada-x.entrada)[0];
    const veh=u?u.vehiculos.find(v=>v.tipo===selok.tipo)||u.vehiculos[0]:null;
    const acts=admin()?`<div style="display:grid;gap:8px;margin-top:18px">
      ${selok.estado==="Disponible"?`<a class="btn s" href="#/asignar?c=${selok.id}">Asignar a un usuario</a>`:""}
      ${selok.estado==="Asignada"?`<button class="btn s" data-act="liberarC" data-id="${selok.id}">Liberar celda</button>`:""}
      <a class="btn s g" href="#/celdas/${selok.id}/editar">Editar celda</a>
      <a class="btn s g" href="#/celdas/${selok.id}/editar">${selok.estado==="Mantenimiento"?"Habilitar celda":"Poner en mantenimiento"}</a></div>`:"";
    panel=`<div class="box"><div class="h"><span class="lbl" style="margin:0">Celda seleccionada</span></div><div class="p">
    <span class="code" style="font-size:44px;letter-spacing:-.03em;line-height:1">${esc(selok.codigo)}</span><div style="color:var(--mute);margin:4px 0 16px">Zona ${esc(selok.zona)} · ${selok.tipo}s</div>
    <div class="kv" style="grid-template-columns:92px 1fr;font-size:13px"><span>Estado</span><b class="st">${selok.estado}</b>
    <span>Usuario</span><b>${u?`<a href="#/usuarios/${u.id}" style="text-decoration:underline">${esc(nombre(u))}</a>`:"—"}</b>
    <span>Vehículo</span><b>${veh?plate(veh.placa):"—"}</b>
    <span>Observaciones</span><b>${esc(selok.observaciones||"—")}</b>
    <span>Último uso</span><b>${ult?fechaHoraTs(ult.salida||ult.entrada):"—"}</b></div>${acts}</div></div>`;
  }
  return shell("celdas",pagina(`<div class="title"><div><div class="crumb">Celdas</div><h1>Mapa de celdas</h1></div>${admin()?'<a class="btn p" href="#/celdas/nueva">+ Nueva celda</a>':""}</div>
  <div class="split" style="grid-template-columns:1fr 290px"><div>
  <div><b style="font-size:16px">${tot} celdas</b> <span style="color:var(--ink2)">· ${o} ocupadas · ${a} asignadas · ${d} disponibles · ${m} en mantenimiento</span></div>${meter}
  <div class="tabs2">${tabs}</div>${lotHTML(cs,{act:"selcelda",sel:selok?selok.id:null})}${legendHTML()}</div>
  <div>${panel}</div></div>`));
}

function iniciarFC(id){
  const key=location.hash;
  if(id){const c=celdaById(id);ui.formC={key,id,err:{},d:{codigo:c.codigo,zona:c.zona,tipo:c.tipo,observaciones:c.observaciones}}}
  else ui.formC={key,id:null,err:{},d:{codigo:"",zona:ui.zona||"A",tipo:"Carro",observaciones:""}};
}
function leerFormC(){
  const f=ui.formC,g=id=>{const e=document.getElementById(id);return e?e.value:""};
  f.d={codigo:g("c_codigo"),zona:g("c_zona"),tipo:g("c_tipo")||"Carro",observaciones:g("c_obs")};
}

function vistaFormC(id){
  if(!admin())return sinPermiso("celdas");
  if(id&&!celdaById(id))return vistaCeldas();
  if(!ui.formC||ui.formC.key!==location.hash)iniciarFC(id);
  const f=ui.formC,d=f.d,e=f.err,c=id?celdaById(id):null;
  const fe=k=>e[k]?`<div class="hint e fe">▲ ${esc(e[k])}</div>`:"";
  const u=c&&c.usuarioId?userById(c.usuarioId):null;
  const ult=c?db.accesos.filter(x=>x.celdaId===c.id).sort((x,y)=>y.entrada-x.entrada)[0]:null;
  const prev=`<div class="lot" style="padding:12px"><div class="row t" style="width:110px;margin:0 auto"><div class="bay ${c?c.estado[0]:"D"}" style="height:130px;cursor:default"><span class="c" id="pvc">${esc(d.codigo.toUpperCase()||"—")}</span>${c&&c.estado==="Ocupada"?'<div class="car"></div>':""}${c&&c.estado==="Asignada"&&u?`<span class="ow">${esc(iniciales(u))}</span>`:""}</div></div></div>`;
  const mant=c?`<section><h2>Mantenimiento</h2><div class="box"><div class="p" style="display:flex;flex-direction:column;gap:12px">
    ${c.estado==="Mantenimiento"?`<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap"><span>La celda está fuera de servicio.</span><button class="btn g" data-act="mant">Habilitar celda</button></div>`
    :`<div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end"><div><span class="lbl">Motivo *</span><input class="inp" id="f_motivo" placeholder="Ej. reparación de piso, señalización, iluminación…"></div><button class="btn g" data-act="mant">Deshabilitar celda</button></div>`}
    <div class="warn"><span style="font-weight:700">!</span><span>Una celda <b>ocupada</b> no se puede deshabilitar. Si está asignada, se libera la asignación.</span></div></div></div></section>`:"";
  const hist=c?`<div style="margin-top:8px"><span class="lbl">Historial de estados</span><table><thead><tr><th>Fecha</th><th>Estado</th><th>Responsable</th><th>Motivo</th></tr></thead><tbody>${c.historial.slice(0,8).map(h=>`<tr><td class="mono">${fechaHoraTs(h.ts)}</td><td>${h.estado}</td><td>${esc(h.responsable)}</td><td style="color:var(--ink2)">${esc(h.motivo)}</td></tr>`).join("")}</tbody></table></div>`:"";
  return shell("celdas",pagina(`<div class="title"><div><div class="crumb"><a href="#/celdas">Celdas</a> / ${c?esc(c.codigo):"Nueva"}</div><h1>${c?`Editar celda <span class="code" style="font-size:28px">${esc(c.codigo)}</span>`:"Nueva celda"}</h1>${c?`<div class="sub">Zona ${esc(c.zona)} · ${c.tipo}s · ${c.estado}</div>`:""}</div></div>
  <div style="display:grid;grid-template-columns:1fr 330px;gap:40px"><div class="stack" style="gap:24px">
  <section><h2>Datos de la celda</h2><div class="stack" style="gap:16px"><div class="grid3">
  <div><span class="lbl">Código *</span><input class="inp${e.codigo?" err":""}" id="c_codigo" value="${esc(d.codigo)}" placeholder="A-25" style="text-transform:uppercase" data-input="codprev">${e.codigo?fe("codigo"):'<div class="hint">Único en el parqueadero</div>'}</div>
  <div><span class="lbl">Zona *</span><input class="inp${e.zona?" err":""}" id="c_zona" value="${esc(d.zona)}" list="zonas" style="text-transform:uppercase"><datalist id="zonas">${zonas().map(z=>`<option value="${z}">`).join("")}</datalist>${fe("zona")}</div>
  <div><span class="lbl">Tipo de vehículo *</span><select class="inp${e.tipo?" err":""}" id="c_tipo"><option${d.tipo==="Carro"?" selected":""}>Carro</option><option${d.tipo==="Moto"?" selected":""}>Moto</option></select>${fe("tipo")}</div></div>
  <div><span class="lbl">Observaciones</span><input class="inp" id="c_obs" value="${esc(d.observaciones)}"></div></div></section>${mant}${hist}</div>
  <div class="stack" style="gap:24px"><div><span class="lbl">Vista previa</span>${prev}</div>
  ${c?`<div class="box"><div class="h"><span class="lbl" style="margin:0">Estado actual</span></div><div class="p"><div class="kv" style="grid-template-columns:96px 1fr;font-size:13px"><span>Estado</span><b class="st">${c.estado}</b><span>Asignada a</span><b>${u?esc(nombre(u)):"—"}</b><span>Último uso</span><b>${ult?fechaHoraTs(ult.salida||ult.entrada):"—"}</b></div></div></div>`:""}</div></div>
  <div class="foot"><span class="hint" style="margin:0">* Campos obligatorios</span><div class="acts"><a class="btn g" href="#/celdas">Cancelar</a><button class="btn p" data-act="guardarC">${c?"Guardar cambios":"Crear celda"}</button></div></div>`));
}

function iniciarAs(){
  const q=new URLSearchParams((location.hash.split("?")[1]||""));
  const p=location.hash.replace(/^#\/?/,"").split("?")[0].split("/");
  const uId=p[1]?+p[1]:null;
  const cId=q.get("c")?+q.get("c"):null;
  ui.as={u:uId,placa:null,zona:null,c:cId};
  const c=cId?celdaById(cId):null;
  if(c){ui.as.zona=c.zona}
  if(uId){const u=userById(uId);if(u&&u.vehiculos.length===1)ui.as.placa=u.vehiculos[0].placa}
  ui.asKey=location.hash;
}

function vistaAsignar(){
  if(!admin())return sinPermiso("celdas");
  if(ui.asKey!==location.hash)iniciarAs();
  const s=ui.as;
  const elegibles=db.usuarios.filter(vigente).sort((a,b)=>nombre(a).localeCompare(nombre(b)));
  const u=s.u?userById(s.u):null;
  const veh=u?u.vehiculos.find(v=>v.placa===s.placa):null;
  const uOpts=`<option value="">Selecciona un usuario</option>`+elegibles.map(x=>`<option value="${x.id}"${x.id===s.u?" selected":""}>${esc(nombre(x))} · ${x.tipoDoc} ${fmtDoc(x.documento)}</option>`).join("");
  const vehs=u?u.vehiculos.map(v=>`<label class="opt${v.placa===s.placa?" on":""}"><input type="radio" name="veh" data-change="asveh" value="${v.placa}"${v.placa===s.placa?" checked":""}>${plate(v.placa)}<em>${v.tipo}</em></label>`).join(""):`<div style="color:var(--mute)">Elige primero un usuario.</div>`;
  let paso3=`<div style="color:var(--mute)">Elige el vehículo para ver las celdas compatibles.</div>`;
  let resumen="Elige usuario, vehículo y celda";
  if(veh){
    const comp=db.celdas.filter(c=>c.tipo===veh.tipo);
    const zs=[...new Set(comp.map(c=>c.zona))].sort();
    if(!zs.includes(s.zona))s.zona=zs.find(z=>comp.some(c=>c.zona===z&&c.estado==="Disponible"))||zs[0];
    const cs=comp.filter(c=>c.zona===s.zona);
    const libres=cs.filter(c=>c.estado==="Disponible").length;
    const tabs=zs.map(z=>`<a class="${z===s.zona?"on":""}" data-act="aszona" data-z="${z}">Zona ${z}</a>`).join("");
    paso3=`<div class="tabs2">${tabs}<span style="margin-left:auto;color:var(--mute)">${libres} disponibles</span></div>${cs.length?lotHTML(cs,{act:"pickcelda",sel:s.c,dim:true}):""}${legendHTML()}<div class="hint">Las celdas atenuadas no están disponibles.</div>`;
    const c=s.c?celdaById(s.c):null;
    if(c&&c.estado==="Disponible"&&c.tipo===veh.tipo)resumen=`Se asignará la celda <b class="code">${esc(c.codigo)}</b> a <b>${esc(nombre(u))}</b>${u.celdaId?` (reemplaza ${esc(celdaById(u.celdaId).codigo)})`:""}`;
  }
  const lista=s.c&&veh&&celdaById(s.c)&&celdaById(s.c).estado==="Disponible"&&celdaById(s.c).tipo===veh.tipo;
  return shell("celdas",pagina(`<div class="title"><div><div class="crumb"><a href="#/celdas">Celdas</a> / Asignar</div><h1>Asignar celda</h1></div></div>
  <div style="display:grid;grid-template-columns:320px 1fr;gap:36px"><div class="stack" style="gap:26px">
  <div><div class="sth"><span class="stepn">1</span>Usuario</div><select class="inp" data-change="asusuario">${uOpts}</select>
  ${u?`<div class="hint">Mensualidad hasta ${fecha(u.vence)}${u.celdaId?` · celda actual ${esc(celdaById(u.celdaId).codigo)}`:""}</div>`:""}</div>
  <div><div class="sth"><span class="stepn">2</span>Vehículo</div>${vehs}
  <div class="warn" style="margin-top:8px"><span style="font-weight:700">!</span><span>Solo se muestran celdas <b>disponibles</b> compatibles con el tipo de vehículo.</span></div></div></div>
  <div><div class="sth"><span class="stepn">3</span>Celda</div>${paso3}</div></div>
  <div class="foot"><span>${resumen}</span><div class="acts"><a class="btn g" href="${u?`#/usuarios/${u.id}`:"#/celdas"}">Cancelar</a><button class="btn p" data-act="confirmarAs"${lista?"":" disabled"}>Confirmar asignación</button></div></div>`));
}

function vistaAcceso(){
  const dentro=db.accesos.filter(a=>!a.salida);
  const rec=[...db.accesos].sort((a,b)=>(b.salida||b.entrada)-(a.salida||a.entrada)).slice(0,12);
  const m=ui.acc;
  return shell("acceso",pagina(`<div class="title"><div><div class="crumb">Entradas y salidas</div><h1>Entradas y salidas</h1><div class="sub">${dentro.length} vehículos dentro del parqueadero</div></div></div>
  <div style="max-width:760px;margin-bottom:28px">${m?`<div class="flash${m.ok?"":" bad"}">${esc(m.msg)}</div>`:""}
  <span class="lbl">Placa del vehículo</span><div style="display:flex;gap:10px;flex-wrap:wrap"><input class="inp mono" id="a_placa" placeholder="ABC123" maxlength="7" style="max-width:220px;text-transform:uppercase;font-weight:700" autocomplete="off">
  <button class="btn p" data-act="entrada">Registrar entrada</button><button class="btn" data-act="salida">Registrar salida</button></div></div>
  <span class="lbl">Movimientos recientes</span>${tablaAccesos(rec,true)}`));
}

/* ====================== Iteración 3: gestión de pagos ====================== */
const pagoById=id=>db.pagos.find(p=>p.id===id);
const tipoTarifa=u=>{const c=u.celdaId&&celdaById(u.celdaId);return c?c.tipo:(u.vehiculos[0]||{tipo:"Carro"}).tipo};
const ultimoAplicado=uId=>db.pagos.filter(p=>p.usuarioId===uId&&p.estado==="Aplicado").sort((a,b)=>b.id-a.id)[0];
const aplicados=()=>db.pagos.filter(p=>p.estado==="Aplicado");
const mismoDia=(ts,d)=>new Date(ts).toDateString()===d.toDateString();
const mismoMes=(ts,d)=>{const x=new Date(ts);return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()};
const recaudoHoy=()=>aplicados().filter(p=>mismoDia(p.ts,new Date())).reduce((s,p)=>s+p.valor,0);
const recaudoMes=()=>aplicados().filter(p=>mismoMes(p.ts,new Date())).reduce((s,p)=>s+p.valor,0);
const nMes=()=>aplicados().filter(p=>mismoMes(p.ts,new Date())).length;
const mesNombre=()=>new Date().toLocaleDateString("es-CO",{month:"long"});

function liquidar(u,meses){
  const vig=vigente(u);
  const base=vig?u.vence:fmtISO(hoy());
  const tipo=tipoTarifa(u),tarifa=db.tarifas[tipo];
  return{vig,tipo,tarifa,meses,desde:vig?addDiasISO(u.vence,1):fmtISO(hoy()),hasta:sumaMeses(base,meses),valor:tarifa*meses};
}

function validarPago(f){
  const e={};
  const u=f.u?userById(f.u):null;
  if(!u)e.u="Selecciona un usuario";
  else if(u.estado!=="Activo")e.u="El usuario está inactivo: actívalo antes de cobrar";
  if(!Number.isInteger(f.meses)||f.meses<1||f.meses>12)e.meses="Entre 1 y 12 meses";
  else if(u&&u.estado==="Activo"&&liquidar(u,f.meses).hasta>sumaMeses(fmtISO(hoy()),12))e.meses="No se pueden pagar más de 12 meses por adelantado";
  if(!MEDIOS.includes(f.medio))e.medio="Elige el medio de pago";
  if(f.medio==="Efectivo"){
    const rec=parseInt(String(f.recibido).replace(/\D/g,""),10);
    if(!rec)e.recibido="Escribe el valor recibido";
    else if(u&&!e.u&&!e.meses&&rec<liquidar(u,f.meses).valor)e.recibido="El valor recibido no cubre el total";
  }else if(MEDIOS.includes(f.medio)&&!/^[A-Za-z0-9-]{4,20}$/.test(String(f.ref).trim()))e.ref="Referencia de 4 a 20 letras o números";
  return e;
}

function registrarPago(f){
  const u=userById(f.u),l=liquidar(u,f.meses);
  const rec=f.medio==="Efectivo"?parseInt(String(f.recibido).replace(/\D/g,""),10):l.valor;
  const p={id:nextId(db.pagos),usuarioId:u.id,desde:l.desde,hasta:l.hasta,meses:f.meses,valor:l.valor,tipo:l.tipo,medio:f.medio,
    referencia:f.medio==="Efectivo"?"":String(f.ref).trim().toUpperCase(),recibido:rec,cambio:rec-l.valor,ts:Date.now(),responsable:db.rol,
    estado:"Aplicado",venceAnt:u.vence,inicioAnt:u.inicio,anulacion:null};
  if(!l.vig)u.inicio=fmtISO(hoy());
  u.vence=l.hasta;
  db.pagos.push(p);
  logU(u,`Pago ${numRecibo(p.id)} aplicado · mensualidad hasta ${fecha(u.vence)}`);
  guardar();
  return p;
}

function anularPago(id,motivo){
  if(!admin())return"Solo el Administrador puede anular pagos";
  const p=pagoById(id);
  if(!p)return"El pago no existe";
  if(p.estado!=="Aplicado")return"El pago ya está anulado";
  if(motivo.trim().length<5)return"Escribe el motivo de la anulación (mínimo 5 caracteres)";
  const u=userById(p.usuarioId);
  const ult=ultimoAplicado(p.usuarioId);
  if(!ult||ult.id!==p.id)return"Solo se puede anular el último pago aplicado del usuario";
  if(p.venceAnt<fmtISO(hoy())&&db.accesos.some(a=>a.usuarioId===u.id&&!a.salida))return"No se puede anular: el vehículo está dentro y la mensualidad quedaría vencida";
  u.vence=p.venceAnt;u.inicio=p.inicioAnt;
  p.estado="Anulado";p.anulacion={ts:Date.now(),responsable:db.rol,motivo:motivo.trim()};
  logU(u,`Pago ${numRecibo(p.id)} anulado · mensualidad hasta ${fecha(u.vence)}`);
  guardar();return null;
}

function validarTarifas(f){
  const e={};
  ["Carro","Moto"].forEach(t=>{
    const v=parseInt(String(f[t]).replace(/\D/g,""),10);
    if(!v)e[t]="Obligatoria";
    else if(v<10000||v>2000000)e[t]="Entre $10.000 y $2.000.000";
    else if(v%1000)e[t]="Debe ser múltiplo de $1.000";
  });
  return e;
}
function guardarTarifas(){
  if(!admin())return"Solo el Administrador puede cambiar las tarifas";
  leerTf();
  const f=ui.tf;f.err=validarTarifas(f);
  if(Object.keys(f.err).length){render();return"Revisa los valores de las tarifas"}
  let cambios=0;
  ["Carro","Moto"].forEach(t=>{
    const v=parseInt(String(f[t]).replace(/\D/g,""),10);
    if(v!==db.tarifas[t]){db.tarifasHist.unshift({ts:Date.now(),responsable:db.rol,tipo:t,antes:db.tarifas[t],despues:v});db.tarifas[t]=v;cambios++}
  });
  guardar();ui.tf=null;
  return cambios?null:"No hay cambios para guardar";
}

const cartera=()=>db.usuarios.filter(u=>u.estado==="Activo"&&diasHasta(u.vence)<=3)
  .sort((a,b)=>a.vence.localeCompare(b.vence));

function situacion(u){
  const d=diasHasta(u.vence);
  if(d<0)return`<b>Vencida</b> hace ${-d} ${-d===1?"día":"días"}`;
  if(d===0)return"<b>Vence hoy</b>";
  return`<b>Por vencer</b> en ${d} ${d===1?"día":"días"}`;
}

/* ---------- Listado de pagos ---------- */
function filtrarP(){
  const f=ui.fp,q=f.q.trim().toLowerCase();
  return [...db.pagos].sort((a,b)=>b.ts-a.ts).filter(p=>{
    const u=userById(p.usuarioId);
    if(q){const h=[numRecibo(p.id),u?nombre(u):"",u?u.documento:"",...(u?u.vehiculos.flatMap(v=>[v.placa,fmtPlaca(v.placa)]):[])].join(" ").toLowerCase();if(!h.includes(q.replace(/\s+/g," ")))return false}
    if(f.estado!=="todos"&&p.estado!==f.estado)return false;
    if(f.medio!=="todos"&&p.medio!==f.medio)return false;
    if(f.per==="hoy"&&!mismoDia(p.ts,new Date()))return false;
    if(f.per==="mes"&&!mismoMes(p.ts,new Date()))return false;
    return true;
  });
}

function tablaP(){
  const f=ui.fp,lista=filtrarP();
  const pags=Math.max(1,Math.ceil(lista.length/PAG));
  if(f.pag>pags)f.pag=pags;
  const ini=(f.pag-1)*PAG,vis=lista.slice(ini,ini+PAG);
  const filas=vis.map(p=>{
    const u=userById(p.usuarioId);
    return `<tr data-href="#/pagos/recibo/${p.id}"><td class="code nw">${numRecibo(p.id)}</td><td class="mono nw">${fechaHoraTs(p.ts)}</td>
    <td><b>${u?esc(nombre(u)):"—"}</b><small class="mono">${u?u.vehiculos.map(v=>fmtPlaca(v.placa)).join(", "):""}</small></td>
    <td class="nw">${fechaC(p.desde)} → ${fechaC(p.hasta)}</td><td>${p.medio}</td><td class="num${p.estado==="Anulado"?" tach":""}">${cop(p.valor)}</td>
    <td><span class="st${p.estado==="Anulado"?" no":""}">${p.estado}</span></td></tr>`;
  }).join("");
  const nums=Array.from({length:pags},(_,i)=>`<button class="${i+1===f.pag?"on":""}" data-act="pagP" data-n="${i+1}">${i+1}</button>`).join("");
  return `<table><thead><tr><th>Recibo</th><th>Fecha</th><th>Usuario</th><th>Período cubierto</th><th>Medio</th><th style="text-align:right">Valor</th><th>Estado</th></tr></thead>
  <tbody>${filas||`<tr><td colspan="7" class="empty">No hay pagos que coincidan con los filtros.</td></tr>`}</tbody></table>
  <div class="pag"><span>${lista.length?`Mostrando ${ini+1}–${ini+vis.length} de ${lista.length}`:"Sin resultados"}</span><div>${nums}</div></div>`;
}

function tablaCartera(){
  const l=cartera();
  const filas=l.map(u=>{
    const c=u.celdaId?celdaById(u.celdaId):null;
    return `<tr data-href="#/pagos/nuevo/${u.id}"><td><b>${esc(nombre(u))}</b><small class="mono">${u.tipoDoc} ${fmtDoc(u.documento)}</small></td>
    <td>${u.vehiculos.map(v=>plate(v.placa)).join(" ")}</td><td class="code">${c?esc(c.codigo):"—"}</td>
    <td>${fecha(u.vence)}</td><td>${situacion(u)}</td><td class="num">${cop(db.tarifas[tipoTarifa(u)])}</td><td style="text-align:right"><span class="btn s">Cobrar</span></td></tr>`;
  }).join("");
  return `<table><thead><tr><th>Usuario</th><th>Placas</th><th>Celda</th><th>Vence</th><th>Situación</th><th style="text-align:right">Un mes</th><th></th></tr></thead>
  <tbody>${filas||`<tr><td colspan="7" class="empty">Ningún usuario activo tiene la mensualidad vencida o por vencer.</td></tr>`}</tbody></table>`;
}

function vistaPagos(){
  const f=ui.fp,ps=db.pagos;
  const nv=cartera().filter(u=>diasHasta(u.vence)<0).length,np=cartera().filter(u=>diasHasta(u.vence)>=0).length;
  const n=fn=>ps.filter(fn).length;
  const rad=(k,v,t,c)=>`<label class="chk"><input type="radio" name="p_${k}" value="${v}" data-change="fpfiltro" data-k="${k}"${f[k]===v?" checked":""}>${t}<em>${c}</em></label>`;
  const rail=`<input class="inp" id="p_q" placeholder="Recibo, nombre, documento o placa" value="${esc(f.q)}" data-input="buscarP" style="margin-bottom:22px">
  <div class="grp"><span class="lbl">Período</span>${rad("per","todos","Todos",ps.length)}${rad("per","mes","Este mes",n(p=>mismoMes(p.ts,new Date())))}${rad("per","hoy","Hoy",n(p=>mismoDia(p.ts,new Date())))}</div>
  <div class="grp"><span class="lbl">Estado</span>${rad("estado","todos","Todos",ps.length)}${rad("estado","Aplicado","Aplicados",n(p=>p.estado==="Aplicado"))}${rad("estado","Anulado","Anulados",n(p=>p.estado==="Anulado"))}</div>
  <div class="grp"><span class="lbl">Medio de pago</span>${rad("medio","todos","Todos",ps.length)}${MEDIOS.map(m=>rad("medio",m,m,n(p=>p.medio===m))).join("")}</div>`;
  const tabs=[["pagos","Pagos registrados"],["cartera",`Cartera · ${nv+np}`]].map(([k,t])=>`<a class="${ui.ptab===k?"on":""}" data-act="ptab" data-k="${k}">${t}</a>`).join("");
  const kpis=`<div class="kpis"><div class="kpi"><span class="lbl">Recaudo de hoy</span><b>${cop(recaudoHoy())}</b></div>
  <div class="kpi"><span class="lbl">Recaudo de ${mesNombre()}</span><b>${cop(recaudoMes())}</b><small>${nMes()} pagos aplicados</small></div>
  <div class="kpi"><span class="lbl">Por vencer · 3 días</span><b>${np}</b><small>usuarios activos</small></div>
  <div class="kpi"><span class="lbl">Con mensualidad vencida</span><b>${nv}</b><small>usuarios activos</small></div></div>`;
  const cuerpo=ui.ptab==="cartera"?`<section id="tablaC">${tablaCartera()}</section>`
    :`<div class="split"><aside>${rail}</aside><section id="tablaP">${tablaP()}</section></div>`;
  return shell("pagos",pagina(`<div class="title"><div><div class="crumb">Pagos</div><h1>Pagos</h1><div class="sub">${aplicados().length} pagos aplicados · tarifa mensual: carro ${cop(db.tarifas.Carro)} · moto ${cop(db.tarifas.Moto)}</div></div>
  <div style="display:flex;gap:8px"><a class="btn g" href="#/pagos/tarifas">Tarifas</a><a class="btn p" href="#/pagos/nuevo">+ Registrar pago</a></div></div>
  ${kpis}<div class="tabs2">${tabs}</div>${cuerpo}`));
}

/* ---------- Registrar pago ---------- */
function iniciarPg(uId){ui.pg={key:location.hash,u:uId||null,meses:1,medio:"Efectivo",ref:"",recibido:"",err:{}}}
function leerPg(){
  const f=ui.pg;
  if($("#p_ref"))f.ref=$("#p_ref").value;
  if($("#p_recibido"))f.recibido=$("#p_recibido").value;
}

function vistaFormPago(uId){
  if(!ui.pg||ui.pg.key!==location.hash)iniciarPg(uId);
  const f=ui.pg,e=f.err,u=f.u?userById(f.u):null;
  const fe=k=>e[k]?`<div class="hint e fe">▲ ${esc(e[k])}</div>`:"";
  const elegibles=db.usuarios.filter(x=>x.estado==="Activo").sort((a,b)=>nombre(a).localeCompare(nombre(b)));
  const uOpts=`<option value="">Selecciona un usuario</option>`+elegibles.map(x=>`<option value="${x.id}"${x.id===f.u?" selected":""}>${esc(nombre(x))} · ${x.tipoDoc} ${fmtDoc(x.documento)}</option>`).join("");
  const ok=u&&u.estado==="Activo";
  const l=ok?liquidar(u,f.meses):null;
  const mesesH=[1,2,3,6,12].map(m=>`<label class="opt c${m===f.meses?" on":""}"><input type="radio" name="meses" data-change="pgmeses" value="${m}"${m===f.meses?" checked":""}>${m} ${m===1?"mes":"meses"}</label>`).join("");
  const mediosH=MEDIOS.map(m=>`<label class="opt${m===f.medio?" on":""}"><input type="radio" name="medio" data-change="pgmedio" value="${m}"${m===f.medio?" checked":""}>${m}</label>`).join("");
  const rec=parseInt(String(f.recibido).replace(/\D/g,""),10)||0;
  const extra=f.medio==="Efectivo"
    ?`<div style="margin-top:6px"><span class="lbl">Valor recibido *</span><input class="inp mono${e.recibido?" err":""}" id="p_recibido" inputmode="numeric" placeholder="${l?String(Math.ceil(l.valor/10000)*10000):"200000"}" value="${esc(f.recibido)}" data-input="recibido">${fe("recibido")}
      <div class="hint" id="p_cambio">${l&&rec>=l.valor?`Cambio a devolver: <b>${cop(rec-l.valor)}</b>`:"Se calcula el cambio al escribir el valor"}</div></div>`
    :`<div style="margin-top:6px"><span class="lbl">Referencia de la transacción *</span><input class="inp mono${e.ref?" err":""}" id="p_ref" maxlength="20" value="${esc(f.ref)}" placeholder="${f.medio==="Tarjeta"?"Código de aprobación":"Número de la transferencia"}" style="text-transform:uppercase">${fe("ref")}</div>`;
  const liqBox=l?`<div class="box"><div class="h"><span class="lbl" style="margin:0">Liquidación</span><span class="st" style="font-size:12.5px">${l.vig?"Renovación":"Nuevo período"}</span></div><div class="p">
    <div class="kv" style="grid-template-columns:130px 1fr;font-size:13px"><span>Usuario</span><b>${esc(nombre(u))}</b>
    <span>Celda</span><b>${u.celdaId?esc(celdaById(u.celdaId).codigo):"Sin celda"}</b>
    <span>Tarifa mensual</span><b>${cop(l.tarifa)} <small style="color:var(--mute)">· ${l.tipo}</small></b>
    <span>Meses</span><b>× ${l.meses}</b>
    <span>Período cubierto</span><b>${fecha(l.desde)} → ${fecha(l.hasta)}</b>
    <span>Vencimiento actual</span><b>${fecha(u.vence)}${vigente(u)?"":" · vencida"}</b></div>
    <div class="tot"><span class="lbl" style="margin:0">Total a cobrar</span><b>${cop(l.valor)}</b></div>
    <div class="warn" style="margin-top:14px"><span style="font-weight:700">!</span><span>${l.vig?`La mensualidad está vigente: el pago se suma <b>a continuación</b> del vencimiento actual.`:`La mensualidad está vencida: el nuevo período empieza <b>hoy</b>.`}</span></div></div></div>`
    :`<div class="box"><div class="h"><span class="lbl" style="margin:0">Liquidación</span></div><div class="p" style="color:var(--mute)">Elige un usuario activo para calcular el valor a cobrar.</div></div>`;
  return shell("pagos",pagina(`<div class="title"><div><div class="crumb"><a href="#/pagos">Pagos</a> / Registrar pago</div><h1>Registrar pago</h1></div></div>
  <div style="display:grid;grid-template-columns:340px 1fr;gap:40px;max-width:1040px"><div class="stack" style="gap:26px">
  <div><div class="sth"><span class="stepn">1</span>Usuario</div><select class="inp${e.u?" err":""}" data-change="pgusuario">${uOpts}</select>${fe("u")}
  ${u?`<div class="hint">${u.vehiculos.map(v=>fmtPlaca(v.placa)).join(", ")} · mensualidad hasta ${fecha(u.vence)}</div>`:""}</div>
  <div><div class="sth"><span class="stepn">2</span>Meses a pagar</div><div class="meses">${mesesH}</div>${fe("meses")}</div>
  <div><div class="sth"><span class="stepn">3</span>Medio de pago</div>${mediosH}${extra}</div></div>
  <div>${liqBox}</div></div>
  <div class="foot"><span>${l?`Total <b>${cop(l.valor)}</b> · cubre hasta <b>${fecha(l.hasta)}</b>`:"Elige usuario, meses y medio de pago"}</span><div class="acts"><a class="btn g" href="${u?`#/usuarios/${u.id}`:"#/pagos"}">Cancelar</a><button class="btn p" data-act="confirmarPago"${ok?"":" disabled"}>Confirmar pago</button></div></div>`));
}

/* ---------- Recibo ---------- */
function vistaRecibo(id){
  const p=pagoById(id),u=p&&userById(p.usuarioId);
  if(!p||!u)return shell("pagos",pagina(`<div class="title"><div><h1>Recibo no encontrado</h1><div class="sub"><a href="#/pagos" style="text-decoration:underline">Volver a pagos</a></div></div></div>`));
  const c=u.celdaId?celdaById(u.celdaId):null;
  const anul=p.estado==="Anulado";
  const ult=ultimoAplicado(u.id);
  const puedeAnular=admin()&&!anul&&ult&&ult.id===p.id;
  const fila=(a,b)=>`<div class="rr"><span>${a}</span><b>${b}</b></div>`;
  return shell("pagos",pagina(`<div class="title"><div><div class="crumb"><a href="#/pagos">Pagos</a> / Recibo ${numRecibo(p.id)}</div><h1>Recibo de pago</h1></div>
  <div style="display:flex;gap:8px"><button class="btn g" data-act="imprimir">Imprimir recibo</button>${puedeAnular?`<button class="btn" data-act="anular" data-id="${p.id}">Anular pago</button>`:""}</div></div>
  <div class="rcb${anul?" anul":""}">${anul?'<div class="sello">ANULADO</div>':""}
  <div class="rh"><span class="word" style="color:#111">AUTOS COLOMBIA</span><span class="mono" style="font-weight:700">${numRecibo(p.id)}</span></div>
  <div class="sub" style="margin:0 0 14px">Recibo de pago de mensualidad · ${fechaHoraTs(p.ts)}</div>
  ${fila("Usuario",esc(nombre(u)))}${fila("Documento",`${u.tipoDoc} ${fmtDoc(u.documento)}`)}
  ${fila("Placas",u.vehiculos.map(v=>plate(v.placa)).join(" "))}${fila("Celda",c?esc(c.codigo):"Sin celda")}
  <div class="sep"></div>
  ${fila("Concepto",`Mensualidad ${p.tipo.toLowerCase()} × ${p.meses} ${p.meses===1?"mes":"meses"}`)}${fila("Período cubierto",`${fecha(p.desde)} → ${fecha(p.hasta)}`)}
  ${fila("Medio de pago",p.medio+(p.referencia?` · ref. ${esc(p.referencia)}`:""))}
  ${p.medio==="Efectivo"?fila("Recibido / cambio",`${cop(p.recibido)} / ${cop(p.cambio)}`):""}
  <div class="sep"></div>
  <div class="tot" style="margin:0"><span class="lbl" style="margin:0">Total pagado</span><b${anul?' class="tach"':""}>${cop(p.valor)}</b></div>
  <div class="sep"></div>
  ${fila("Atendió",esc(p.responsable))}
  ${anul?`<div class="warn" style="margin-top:14px"><span style="font-weight:700">!</span><span>Anulado el ${fechaHoraTs(p.anulacion.ts)} por ${esc(p.anulacion.responsable)}. Motivo: ${esc(p.anulacion.motivo)}</span></div>`:""}</div>
  <div style="margin-top:18px"><a class="btn s g" href="#/usuarios/${u.id}">Ver usuario</a></div>`));
}

/* ---------- Tarifas ---------- */
function iniciarTf(){ui.tf={key:location.hash,Carro:String(db.tarifas.Carro),Moto:String(db.tarifas.Moto),err:{}}}
function leerTf(){const f=ui.tf;["Carro","Moto"].forEach(t=>{const el=$(`#t_${t}`);if(el)f[t]=el.value})}
function vistaTarifas(){
  if(!ui.tf||ui.tf.key!==location.hash)iniciarTf();
  const f=ui.tf,e=f.err,ed=admin();
  const fila=t=>`<tr><td><b>${t==="Carro"?"Carro":"Moto"}</b><small>Celdas de zona${t==="Carro"?"s A y B":" C"}</small></td>
    <td class="num">${cop(db.tarifas[t])}</td>
    <td>${ed?`<input class="inp mono${e[t]?" err":""}" id="t_${t}" inputmode="numeric" value="${esc(f[t])}" style="max-width:190px">${e[t]?`<div class="hint e fe">▲ ${esc(e[t])}</div>`:""}`:`<span style="color:var(--mute)">Solo el Administrador la modifica</span>`}</td></tr>`;
  const hist=db.tarifasHist.length?`<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Antes</th><th>Después</th><th>Responsable</th></tr></thead><tbody>${db.tarifasHist.slice(0,8).map(h=>`<tr><td class="mono">${fechaHoraTs(h.ts)}</td><td>${h.tipo}</td><td class="num">${cop(h.antes)}</td><td class="num">${cop(h.despues)}</td><td>${esc(h.responsable)}</td></tr>`).join("")}</tbody></table>`:`<div class="empty">Aún no hay cambios de tarifa.</div>`;
  return shell("pagos",pagina(`<div class="title"><div><div class="crumb"><a href="#/pagos">Pagos</a> / Tarifas</div><h1>Tarifas de mensualidad</h1><div class="sub">Valor por mes según el tipo de vehículo de la celda del usuario</div></div></div>
  <div class="stack" style="max-width:860px;gap:26px"><section><table><thead><tr><th>Tipo</th><th style="text-align:right">Tarifa vigente</th><th>${ed?"Nueva tarifa":""}</th></tr></thead><tbody>${fila("Carro")}${fila("Moto")}</tbody></table>
  <div class="warn" style="margin-top:16px"><span style="font-weight:700">!</span><span>Los pagos ya registrados conservan el valor con que se cobraron. El cambio solo afecta los pagos nuevos.</span></div></section>
  <section><span class="lbl">Historial de cambios</span>${hist}</section></div>
  ${ed?`<div class="foot"><span class="hint" style="margin:0">Valores en pesos colombianos, múltiplos de $1.000</span><div class="acts"><a class="btn g" href="#/pagos">Cancelar</a><button class="btn p" data-act="guardarTf">Guardar tarifas</button></div></div>`:""}`));
}

/* ---------- Pestaña "Pagos" del detalle de usuario ---------- */
function pagosDeUsuario(u){
  const lista=db.pagos.filter(p=>p.usuarioId===u.id).sort((a,b)=>b.id-a.id);
  if(!lista.length)return`<div class="empty">Este usuario aún no tiene pagos registrados.</div>`;
  return`<table><thead><tr><th>Recibo</th><th>Fecha</th><th>Período cubierto</th><th>Medio</th><th style="text-align:right">Valor</th><th>Estado</th></tr></thead><tbody>${lista.map(p=>`<tr data-href="#/pagos/recibo/${p.id}"><td class="code nw">${numRecibo(p.id)}</td><td class="mono nw">${fechaHoraTs(p.ts)}</td><td class="nw">${fechaC(p.desde)} → ${fechaC(p.hasta)}</td><td>${p.medio}</td><td class="num${p.estado==="Anulado"?" tach":""}">${cop(p.valor)}</td><td><span class="st${p.estado==="Anulado"?" no":""}">${p.estado}</span></td></tr>`).join("")}</tbody></table>`;
}

function pedirMotivo(msg,ok,txt){
  modalOk=ok;
  $("#modal").innerHTML=`<div class="ovl"><div class="dlg"><p>${esc(msg)}</p><span class="lbl">Motivo *</span><input class="inp" id="m_motivo" style="margin-bottom:18px" placeholder="Ej. cobro duplicado, valor mal digitado…"><div class="dact"><button class="btn g" data-act="cerrar">Cancelar</button><button class="btn p" data-act="okmodal">${esc(txt||"Confirmar")}</button></div></div></div>`;
  const i=$("#m_motivo");if(i)i.focus();
}

function render(){
  const raw=location.hash.replace(/^#\/?/,"")||"usuarios";
  const p=raw.split("?")[0].split("/");
  let html;
  if(p[0]==="usuarios"){
    if(p[1]==="nuevo")html=vistaFormU(null);
    else if(p[1]&&p[2]==="editar")html=vistaFormU(+p[1]);
    else if(p[1])html=vistaDetalle(+p[1]);
    else html=vistaUsuarios();
  }else if(p[0]==="celdas"){
    if(p[1]==="nueva")html=vistaFormC(null);
    else if(p[1]&&p[2]==="editar")html=vistaFormC(+p[1]);
    else html=vistaCeldas();
  }else if(p[0]==="pagos"){
    if(p[1]==="nuevo")html=vistaFormPago(p[2]?+p[2]:null);
    else if(p[1]==="recibo")html=vistaRecibo(+p[2]);
    else if(p[1]==="tarifas")html=vistaTarifas();
    else html=vistaPagos();
  }else if(p[0]==="asignar")html=vistaAsignar();
  else if(p[0]==="acceso")html=vistaAcceso();
  else html=vistaUsuarios();
  $("#app").innerHTML=html;
}

function toast(msg,bad){
  const t=document.createElement("div");
  t.className="toast"+(bad?" bad":"");
  t.textContent=msg;
  $("#toasts").appendChild(t);
  setTimeout(()=>t.remove(),3400);
}
let modalOk=null;
function confirmar(msg,ok,txt){
  modalOk=ok;
  $("#modal").innerHTML=`<div class="ovl"><div class="dlg"><p>${esc(msg)}</p><div class="dact"><button class="btn g" data-act="cerrar">Cancelar</button><button class="btn p" data-act="okmodal">${esc(txt||"Confirmar")}</button></div></div></div>`;
}
function resultado(r,ok){
  if(r)toast(r,true);else{toast(ok);render()}
}

const acciones={
  reset(){confirmar("Se borrarán todos los datos y se restablecerán los datos de ejemplo. ¿Continuar?",()=>{localStorage.removeItem(KEY);db=semilla();guardar();ui.form=null;ui.formC=null;ui.as=null;ui.asKey=null;ui.sel=null;ui.pg=null;ui.tf=null;location.hash="#/usuarios";render();toast("Datos restablecidos")},"Restablecer")},
  cerrar(){$("#modal").innerHTML="";modalOk=null},
  okmodal(){const f=modalOk,m=($("#m_motivo")||{}).value||"";acciones.cerrar();if(f)f(m)},
  pag(el){ui.fu.pag=+el.dataset.n;$("#tabla").innerHTML=tablaU()},
  ptab(el){ui.ptab=el.dataset.k;render()},
  pagP(el){ui.fp.pag=+el.dataset.n;$("#tablaP").innerHTML=tablaP()},
  imprimir(){window.print()},
  anular(el){const p=pagoById(+el.dataset.id);pedirMotivo(`Vas a anular el recibo ${numRecibo(p.id)} por ${cop(p.valor)}. La mensualidad volverá a su vencimiento anterior.`,m=>resultado(anularPago(p.id,m),"Pago anulado"),"Anular pago")},
  confirmarPago(){
    leerPg();const f=ui.pg;
    f.err=validarPago(f);
    if(Object.keys(f.err).length){render();const x=$(".fe");if(x)x.scrollIntoView({block:"center"});return}
    const p=registrarPago(f);
    ui.pg=null;toast(`Pago ${numRecibo(p.id)} registrado`);
    location.hash=`#/pagos/recibo/${p.id}`;
  },
  guardarTf(){const r=guardarTarifas();if(r){toast(r,true);return}toast("Tarifas actualizadas");render()},
  tab(el){ui.tab=el.dataset.k;render()},
  zona(el){ui.zona=el.dataset.z;ui.sel=null;render()},
  selcelda(el){ui.sel=+el.dataset.id;render()},
  agregarV(){leerFormU();ui.form.veh.push({placa:"",tipo:"Carro",marca:"",color:""});render()},
  quitarV(el){leerFormU();ui.form.veh.splice(+el.dataset.i,1);render()},
  guardarU(){guardarUsuario()},
  guardarC(){guardarCelda()},
  estadoU(el){
    const u=userById(+el.dataset.id);
    confirmar(u.estado==="Activo"?`¿Inactivar a ${nombre(u)}? Se liberará la celda que tenga asignada.`:`¿Activar a ${nombre(u)}?`,()=>resultado(cambiarEstadoUsuario(u),u.estado==="Activo"?"Usuario activado":"Usuario inactivado"),u.estado==="Activo"?"Inactivar":"Activar");
  },
  liberarU(el){const c=celdaById(+el.dataset.id);confirmar(`¿Liberar la celda ${c.codigo}?`,()=>resultado(liberar(c.id),"Celda liberada"),"Liberar")},
  liberarC(el){const c=celdaById(+el.dataset.id);confirmar(`¿Liberar la celda ${c.codigo}?`,()=>resultado(liberar(c.id),"Celda liberada"),"Liberar")},
  mant(){
    const c=celdaById(ui.formC.id);
    if(c.estado==="Mantenimiento"){const r=habilitar(c.id);if(r)toast(r,true);else{toast("Celda habilitada");ui.formC=null;render()}return}
    const m=($("#f_motivo")||{}).value||"";
    const r=mantenimiento(c.id,m);
    if(r)toast(r,true);else{toast("Celda en mantenimiento");ui.formC=null;render()}
  },
  aszona(el){ui.as.zona=el.dataset.z;ui.as.c=null;render()},
  pickcelda(el){ui.as.c=+el.dataset.id;render()},
  confirmarAs(){
    const s=ui.as;
    const r=asignar(s.u,s.placa,s.c);
    if(r){toast(r,true);return}
    toast("Celda asignada");
    const id=s.u;
    ui.as=null;ui.asKey=null;
    location.hash=`#/usuarios/${id}`;
  },
  entrada(){const el=$("#a_placa"),v=el.value;ui.acc=entrada(v);render();const n=$("#a_placa");if(n){n.value=v;n.focus()}},
  salida(){const el=$("#a_placa"),v=el.value;ui.acc=salida(v);render();const n=$("#a_placa");if(n){n.value=v;n.focus()}}
};
const cambios={
  rol(el){db.rol=el.value;guardar();const h=location.hash;if(/nuevo|editar|asignar|nueva/.test(h)&&!admin())location.hash="#/usuarios";render()},
  filtro(el){ui.fu[el.dataset.k]=el.value;ui.fu.pag=1;$("#tabla").innerHTML=tablaU()},
  fpfiltro(el){ui.fp[el.dataset.k]=el.value;ui.fp.pag=1;$("#tablaP").innerHTML=tablaP()},
  pgusuario(el){leerPg();ui.pg.u=el.value?+el.value:null;ui.pg.err={};render()},
  pgmeses(el){leerPg();ui.pg.meses=+el.value;ui.pg.err={};render()},
  pgmedio(el){leerPg();ui.pg.medio=el.value;ui.pg.err={};render()},
  tipoveh(el){const i=parseInt(el.id.slice(1));const inp=document.getElementById(`v${i}_placa`);if(inp)inp.dispatchEvent(new Event("input",{bubbles:true}))},
  asusuario(el){ui.as.u=el.value?+el.value:null;ui.as.placa=null;ui.as.c=null;ui.as.zona=null;const u=ui.as.u?userById(ui.as.u):null;if(u&&u.vehiculos.length===1)ui.as.placa=u.vehiculos[0].placa;render()},
  asveh(el){ui.as.placa=el.value;ui.as.c=null;ui.as.zona=null;render()}
};
const entradas={
  buscarU(el){ui.fu.q=el.value;ui.fu.pag=1;$("#tabla").innerHTML=tablaU()},
  buscarP(el){ui.fp.q=el.value;ui.fp.pag=1;$("#tablaP").innerHTML=tablaP()},
  recibido(el){
    const f=ui.pg,u=f.u?userById(f.u):null,box=$("#p_cambio");
    if(!box||!u)return;
    const rec=parseInt(el.value.replace(/\D/g,""),10)||0,l=liquidar(u,f.meses);
    box.innerHTML=rec>=l.valor?`Cambio a devolver: <b>${cop(rec-l.valor)}</b>`:rec?`Faltan <b>${cop(l.valor-rec)}</b>`:"Se calcula el cambio al escribir el valor";
  },
  buscarM(el){ui.qm=el.value;$("#maestro").innerHTML=listaMaestro(+location.hash.split("/")[2])},
  placa(el){
    const i=el.dataset.i,p=norm(el.value),t=($(`#v${i}_tipo`)||{}).value;
    const pv=$(`#pv${i}`);
    if(pv)pv.innerHTML=p?plate(p):"";
    el.classList.toggle("err",!!p&&!placaOk(p,t));
  },
  codprev(el){const x=$("#pvc");if(x)x.textContent=el.value.toUpperCase()||"—"}
};

document.addEventListener("click",e=>{
  const a=e.target.closest("[data-act]");
  if(a){const f=acciones[a.dataset.act];if(f){e.preventDefault();f(a,e)}return}
  const h=e.target.closest("[data-href]");
  if(h)location.hash=h.dataset.href;
});
document.addEventListener("change",e=>{
  const t=e.target.closest("[data-change]");
  if(t){const f=cambios[t.dataset.change];if(f)f(t,e)}
});
document.addEventListener("input",e=>{
  const t=e.target.closest("[data-input]");
  if(t){const f=entradas[t.dataset.input];if(f)f(t,e)}
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape")acciones.cerrar();
  if(e.key==="Enter"&&e.target.id==="a_placa")acciones.entrada();
});
window.addEventListener("hashchange",()=>{window.scrollTo(0,0);render()});
if(!location.hash)location.hash="#/usuarios";
render();
