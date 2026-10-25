// Placas siempre en mayusculas mientras se escriben
document.querySelectorAll('input.mayus').forEach(function (campo) {
  campo.addEventListener('input', function () {
    var pos = campo.selectionStart;
    campo.value = campo.value.toUpperCase().replace(/[\s-]/g, '');
    campo.setSelectionRange(pos, pos);
  });
});

// Mapa de celdas: al hacer clic en una celda libre se escoge para la entrada
var mapa = document.getElementById('mapa-celdas');
if (mapa) {
  var campoCelda = document.getElementById('celda');
  mapa.addEventListener('click', function (evento) {
    var boton = evento.target.closest('button.cell.f, button.cell.s');
    if (!boton || !campoCelda) return;
    mapa.querySelectorAll('button.cell.s').forEach(function (b) {
      b.classList.remove('s');
      b.classList.add('f');
    });
    boton.classList.remove('f');
    boton.classList.add('s');
    campoCelda.value = boton.dataset.codigo;
  });
}

// Filtros de la lista de vehiculos: el tipo se aplica solo al cambiarlo
var filtroTipo = document.getElementById('filtro-tipo');
if (filtroTipo) {
  filtroTipo.addEventListener('change', function () {
    filtroTipo.form.submit();
  });
}

// Los avisos verdes se ocultan solos
document.querySelectorAll('.alert.o[data-auto]').forEach(function (aviso) {
  setTimeout(function () { aviso.style.display = 'none'; }, 8000);
});
