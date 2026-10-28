# filtrar.awk - deja solo las sentencias de una migracion que aplican a una base.
#
# Uso:
#   awk -v base=dulcesnc -v esquema=tiendadb -f filtrar.awk 017_xxx.sql
#
# Las migraciones historicas traen sentencias para las dos bases en el mismo
# archivo (tiendadb.* y tiendadb_abarrotera.*). Como cada esquema vive en una
# base distinta, este filtro separa el contenido:
#
#   - Sentencias con tiendadb_abarrotera.  -> solo van a dulcesnc_abarrotera
#   - Sentencias con tiendadb.             -> solo van a dulcesnc
#   - SET search_path                      -> se reescribe al esquema destino
#   - Sentencias sin calificar (productos) -> van a ambas bases y se resuelven
#                                             con el search_path del esquema
#
# Cada sentencia emitida se marca con "-- @@stmt" para poder contarla.

BEGIN {
    print "SET search_path TO " esquema ";"
    buf = ""
    en_bloque = 0
    en_linea = 0
    en_comilla = 0
    en_comilla_doble = 0
    en_dolar = 0
    etiqueta = ""
}

{
    linea = $0
    n = length(linea)
    i = 1

    while (i <= n) {
        c = substr(linea, i, 1)

        # Comentario de bloque: se descarta.
        if (en_bloque) {
            if (c == "*" && substr(linea, i + 1, 1) == "/") {
                i += 2
                en_bloque = 0
            } else {
                i++
            }
            continue
        }

        # Comentario de linea: se descarta hasta el final de la linea.
        if (en_linea) {
            i++
            continue
        }

        if (en_comilla) {
            buf = buf c
            if (c == "'") {
                if (substr(linea, i + 1, 1) == "'") {
                    buf = buf "'"
                    i += 2
                    continue
                }
                en_comilla = 0
            }
            i++
            continue
        }

        if (en_comilla_doble) {
            buf = buf c
            if (c == "\"") {
                en_comilla_doble = 0
            }
            i++
            continue
        }

        if (en_dolar) {
            if (substr(linea, i, length(etiqueta)) == etiqueta) {
                buf = buf etiqueta
                i += length(etiqueta)
                en_dolar = 0
            } else {
                buf = buf c
                i++
            }
            continue
        }

        # Estado normal: detectar inicio de comentarios y comillas.
        if (c == "-" && substr(linea, i + 1, 1) == "-") {
            en_linea = 1
            i += 2
            continue
        }
        if (c == "/" && substr(linea, i + 1, 1) == "*") {
            en_bloque = 1
            i += 2
            continue
        }
        if (c == "'") {
            en_comilla = 1
            buf = buf c
            i++
            continue
        }
        if (c == "\"") {
            en_comilla_doble = 1
            buf = buf c
            i++
            continue
        }
        if (c == "$") {
            resto = substr(linea, i)
            if (match(resto, /^\$[A-Za-z_0-9]*\$/)) {
                etiqueta = substr(resto, 1, RLENGTH)
                buf = buf etiqueta
                i += RLENGTH
                en_dolar = 1
                continue
            }
        }

        # Fin de sentencia.
        if (c == ";") {
            emitir(buf)
            buf = ""
            i++
            continue
        }

        buf = buf c
        i++
    }

    en_linea = 0
    buf = buf "\n"
}

END {
    emitir(buf)
}

function emitir(sentencia,   minuscula) {
    if (sentencia ~ /^[ \t\r\n]*$/) {
        return
    }

    minuscula = tolower(sentencia)

    # SET search_path: se reescribe al esquema de la base destino.
    if (minuscula ~ /^[ \t\r\n]*set[ \t]+search_path/) {
        print "SET search_path TO " esquema ";"
        print "-- @@stmt"
        return
    }

    # Modo "rewrite": base de una rama dinamica (b3..b6). Las sentencias
    # calificadas con tiendadb. se reescriben al esquema de la rama
    # (p. ej. tiendadb_b3.); las de tiendadb_abarrotera. no aplican.
    if (rewrite != "") {
        if (minuscula ~ /tiendadb_abarrotera\./) {
            return
        }
        if (minuscula ~ /tiendadb\./) {
            gsub(/tiendadb\./, esquema ".", sentencia)
            minuscula = tolower(sentencia)
        }
        print sentencia ";"
        print "-- @@stmt"
        return
    }

    # Sentencias calificadas: solo aplican a la base que contiene el esquema.
    if (minuscula ~ /tiendadb_abarrotera\./) {
        if (base != "dulcesnc_abarrotera") {
            return
        }
    } else if (minuscula ~ /tiendadb\./) {
        if (base != "dulcesnc") {
            return
        }
    }

    print sentencia ";"
    print "-- @@stmt"
}
