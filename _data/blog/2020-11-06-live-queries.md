---
template: BlogPost
path: /live-queries
date: 2020-11-06T17:15:50.738Z
title: Les lives queries pour une application web réactive
thumbnail: /assets/live.jpg
metaDescription: livequeries
---

## Introduction

Dans ce premier article, nous allons voir comment il est possible de rendre l'état d'une valeur en base de données directement dans une vue.
La vue se verra automatiquement notifée d'une modification en base de données. L'idée est que l'utilisateur ne doive plus rafraichir sa page pour voir les nouvelles données apparaitrent.
Bien qu'il soit possible de demander à l'application cliente de requêter le serveur toutes les x secondes (long polling), afin de se mettre à jour, je trouve qu'il est préférable que le serveur nous envoie ces données automatiquement dès qu'une mise à jour est disponible.

Il existe trois solutions :
 - Hazura
 - Postgraphile
 - Prisma

Nous allons utiliser postgraphile. Hazura est bien aussi mais est une Paas. Je préfère utiliser des outils bas niveaux.
L'article sera découpée en deux parties. Dans cette première sont allons réaliser la couche back-end (server side). 
A savoir :
- Une base de donnée postgresql + pgadmin
- La remontée des WAL (Write Applications Logs) vers un serveur nodejs.
- Postgraphile sera utilisée pour cela
- Un serveur nodejs (expressjs)
- Un serveur graphql qui émettra les données sous forme de live-queries.

Je ferai ensuite un article expliquant la couche front-end.

## Installation
 
Commençons directement par créer et configurer la base. Il est important de préciser qu'il est obligatoire d'utiliser une base de données de type Postgresql >= 9.4.
Pour rendre la solution indépendante du système de persistance, il convient d'ajouter une couche d'abstraction supplémentaire. 
Je conseille la solution Debezium.

Pour la réalisation de cette démo, j'utilise un système Linux de type Fedora.

La base de données et le client SQL (PgAdmin 4) sont tous deux installés via docker.

Voici mon fichier docker-compose.yml :

```yml
version: '3.5'

services:
  postgres:
    container_name: postgres_container
    command: postgres -c config_file=/etc/postgresql.conf
    image: postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      PGDATA: /data/postgres
    volumes:
       - postgres:/data/postgres
       - ./postgresql.conf:/etc/postgresql.conf
    ports:
      - "5432:5432"
    networks:
      - postgres
    restart: unless-stopped
  
  pgadmin:
    container_name: pgadmin_container
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_DEFAULT_EMAIL:-pgadmin4@pgadmin.org}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_DEFAULT_PASSWORD:-admin}
    volumes:
       - pgadmin:/root/.pgadmin
    ports:
      - "${PGADMIN_PORT:-5050}:80"
    networks:
      - postgres
    restart: unless-stopped

networks:
  postgres:
    driver: bridge

volumes:
    postgres:
    pgadmin:

```
Nous devons activer une fonction de postgresql appelée 'Logical Decoding'. 
C'est cette fonction qui va permettre au postgresql d'émettre un stream de données lors de modifications sur las base.
C'est pour cela que nous surchargeons le fichier par défaut. De plus, la commande vim n'est pas disponible dans le conteneur.
```
- ./postgresql.conf:/etc/postgresql.conf
```

Il y a trois lignes à décommenter dans fichier de configuration postgresql.conf par defaut.


```
wal_level = logical
max_wal_senders = 10
max_replication_slots = 10
```

Il faut être situé dans un répertoire avec votre fichier postgresql.conf et docker-compose.yml au moment de lancer la commande d'installation.

```
docker-compose -f docker-compose.yml up -d
```

Faite ensuite un ```docker ps``` Vous devriez voir les deux conteneurs démarrés.

Le module wal2json doit également être installé au niveau de la base. Pour cela, nous pouvons entrer dans le conteneur et faire l'installation.

Il faut premièrement récupérer le conteneur id du conteneur postgresql. Vous le retrouvez en faisant un ```docker ps```
11227694b91e dans mon cas.

Il faut donc entrer cette commande :

```
docker exec -it 11227694b91e /bin/bash
```

Installons le package via 
```
apt-get install postgresql-13-wal2json
```

Sortez du conteneur avec la commande ```exit```

Il est temps de se connecter à la base pour véfifier que tout est en place.

Rendez-vous sur http://localhost:5050/

Le login et mot de passe se situent dans le fichier docker-compose.yml (services pgadmin)

Si vous êtes connecté à l'interface web c'est que tout s'est bien passé. 
Connectez-vous finalement au votre serveur 

##Création du serveur Express-node

Express est un framework rapide et léger pour NodeJS.
Par ici pour la documentation : https://expressjs.com 


Premièrement, créer un dossier `server` et déplaçons nous à l'intérieur.

```mkdir server && cd_```

Créer le projet avec la commande

```npm init```

Ensuite, il est temps d'installer nos dépendances

Dépendances
```npm i body-parser cors express knex knex-migrate postgraphile pg```

Dépendances dev
```npm i nodemon dotenv -D```

Voici notre fichier `package.json`

```
{
  "name": "back",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.js",
  "scripts": {
    "start": "node server/src/index.js",
    "watch": "nodemon server/src/index.js"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@graphile/pg-pubsub": "^4.9.0",
    "@graphile/subscriptions-lds": "^4.9.0",
    "body-parser": "^1.19.0",
    "cors": "^2.8.5",
    "express": "^4.17.1",
    "graphile-utils": "^4.9.2",
    "graphql-playground": "^1.3.17",
    "knex": "^0.21.9",
    "knex-migrate": "^1.7.4",
    "pg": "^8.4.2",
    "postgraphile": "^4.9.2"
  },
  "devDependencies": {
    "dotenv": "^8.2.0",
    "nodemon": "^2.0.6"
  }
}

```

Pour permettre au serveur de s'éxecuter, nous devons créer le fichier `src/index.js`

Voici le fichier :

```
require('dotenv').config()

const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const postgraphile = require('./postgraphile')


const { PORT } = process.env

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(postgraphile)


app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

```


A présent, nous allons créer une base de données avec une table que l'on nommera clients




Lectures : https://medium.com/open-graphql/graphql-subscriptions-vs-live-queries-e38302c7ab8e
https://hasura.io/learn/graphql/react/intro-to-graphql/4-watching-data-subscriptions/
https://www.howtographql.com/graphql-js/7-subscriptions/

https://github.com/graphql/graphql-playground
https://www.npmjs.com/package/@graphile/subscriptions-lds
https://www.apollographql.com/docs/graphql-subscriptions/subscriptions-to-schema/
https://www.apollographql.com/blog/how-to-use-subscriptions-in-graphiql-1d6ab8dbd74b/
https://www.apollographql.com/docs/react/data/subscriptions/
https://www.graphile.org/postgraphile/live-queries/
https://medium.com/make-it-heady/part-1-building-full-stack-web-app-with-postgraphile-and-react-server-side-529e2f19e6f1
https://medium.com/make-it-heady/part-2-building-full-stack-web-app-with-postgraphile-and-react-client-side-1c5085c5a182
https://www.graphile.org/postgraphile/live-queries/
https://www.apollographql.com/docs/graphql-subscriptions/setup/
https://www.apollographql.com/blog/how-to-use-subscriptions-in-graphiql-1d6ab8dbd74b/
https://github.com/dotansimha/graphql-code-generator
https://github.com/apollographql/apollo-tooling/
https://graphql-code-generator.com/docs/getting-started/development-workflow
https://www.apollographql.com/docs/react/api/react/hooks/#options
https://www.apollographql.com/docs/react/data/queries/
https://github.com/eulerto/wal2json

