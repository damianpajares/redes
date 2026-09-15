# Diseño: Sitio auto-guiado para el curso de Redes (Redes 1 y Redes 2)

## Contexto

El repositorio contiene material suelto (PDFs + una infografía HTML + un
archivo de comandos) para el curso "CTT – Técnico en Redes y Software"
(ESI Buceo, 2026). El objetivo es organizar ese material en un sitio
estático auto-guiado, dividido en dos módulos:

- **Redes 1** — Introducción a Redes (fundamentos, OSI, IPv4, topologías,
  dispositivos, diagnóstico básico).
- **Redes 2** — Iniciación a Redes Microsoft (Windows Server, Active
  Directory, PowerShell, permisos NTFS, alta disponibilidad).

Los documentos originales (PDF/HTML) no se modifican ni se re-escriben;
el sitio los organiza, contextualiza y agrega autoevaluación.

## Arquitectura

Sitio estático, sin build ni backend:

```
index.html              Portada del curso, tarjetas de acceso a cada módulo
redes1.html              Módulo 1 (4 temas)
redes2.html              Módulo 2 (8 temas)
assets/course.css        Estilos compartidos
assets/course.js         Lógica compartida: checklist, quiz, progreso (localStorage)
```

Los PDFs y el HTML de infografía existentes permanecen en la raíz del
repo con sus nombres actuales y se enlazan con `target="_blank"`.

`Captura.PNG` y `recursos - copia.png` quedan fuera de la guía (son
capturas personales sin relación con el contenido del curso).

## Contenido y secuencia

### Redes 1 — Introducción a Redes

1. Clase 1 – Fundamentos y Arquitectura de Red → `IntroduccionRedes_Clase1.pdf`
2. Documento de estudio: Introducción a Redes MS → `_INTRODUCCIÓN A REDES MS_ .pdf`
3. Infografía visual → `Infografia_Redes_Tecnico.HTML`
4. Apunte avanzado (cierre: OSI, subnetting, diagnóstico avanzado) → `Apunte_Redes_Avanzado.md.pdf`

### Redes 2 — Iniciación a Redes Microsoft

1. Fundamentación conceptual (Windows Server, DNS, DHCP, AD DS, HA) → `FUNDAMENTACIÓN_ Servicios Microsoft y Alta Disponibilidad.pdf`
2. Configuración de red con PowerShell → `Configuración TCP_IP con PowerShell.pdf` + `Comandos-Red-PowerShell.txt`
3. Diagnóstico de red y transferencia SCP → `Diagnóstico de Red con PowerShell y Transferencia SCP.pdf`
4. Despliegue de Windows Server (IP estática, DNS/DHCP, promoción a DC, WSFC+SQL) → `Redes Microsoft - Windows Server Despliegue.pdf`
5. Estructura organizacional en AD (Bosque/Dominio/OU, modelo AGDLP) → `PROFUNDIZACIÓN CONCEPTUAL Y ESTRUCTURA ORGANIZACIONAL EN AD.pdf`
6. Sincronización horaria NTP/Kerberos → `NTP Active Directory, la sincronización horaria .pdf`
7. Permisos NTFS y control de acceso (Clase 4) → `Redes MS_ PERMISOS NTFS Y CONTROL DE ACCESO 🔒.pdf`
8. Automatización con PowerShell (Clases 5-6, cierre) → `Redes MS_ AUTOMATIZACIÓN CON POWERSHELL 🚀.pdf`

El orden sigue la progresión pedagógica interna de los propios documentos
(p. ej. "Permisos NTFS" se auto-referencia como Clase 4 y "Automatización"
como Clases 5-6, y ambos dependen del modelo AGDLP presentado en
"Estructura organizacional en AD").

## Componentes de cada tema (tarjeta)

Cada tema dentro de un módulo se renderiza como una tarjeta con:

- Título y objetivo de aprendizaje (1-2 líneas)
- Tiempo estimado de estudio
- Enlace al recurso original (PDF/HTML), abre en pestaña nueva
- Checkbox "Marcar como visto" (persistido en localStorage)
- Mini-quiz de autoevaluación: 3 preguntas de opción múltiple basadas en
  el contenido real del documento, con feedback inmediato (correcto/
  incorrecto + explicación breve de una línea). El resultado del quiz
  también se guarda en localStorage.

## Progreso

`assets/course.js` expone helpers para leer/escribir el estado en
`localStorage` (clave por tema: visto sí/no, quiz respondido/puntaje).
Cada página de módulo muestra una barra de progreso agregada
(temas vistos / total). `index.html` lee las mismas claves para mostrar
el progreso resumido de cada módulo en su tarjeta.

No hay sincronización entre dispositivos ni backend: el progreso vive
solo en el navegador del estudiante, igual que el resto del curso
(uso individual, autoguiado).

## Estilo visual

Se reutiliza el lenguaje visual de `Infografia_Redes_Tecnico.HTML` ya
existente en el repo (Tailwind CDN, paleta Deep Blue/Cyan/Emerald/Yellow/
Pink, tarjetas redondeadas con sombra) para mantener consistencia con el
material que ya conocen los estudiantes. No se usa build step: Tailwind
vía CDN igual que en el archivo existente.

## Fuera de alcance

- No se reescribe el contenido de los PDFs en HTML.
- No hay autenticación ni tracking de progreso por servidor.
- No se tocan `Captura.PNG` ni `recursos - copia.png`.
