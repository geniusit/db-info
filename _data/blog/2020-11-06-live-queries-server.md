---
template: BlogPost
path: /live-queries-server
date: 2020-11-06T13:15:50.738Z
title: Les lives queries pour une application web réactive - Partie 1
thumbnail: /assets/server.jpeg
metaDescription: livequeries
---

## Introduction

Bienvenue dans mon premier article! Nous allons discuter de live queries. Mais premièrement, qu'est ce qu'une live query ?

>*A “live query” monitors the query a user provides and gives the client an updated version whenever the query would return a different result.*

Cela signifie qu'une application cliente n'a plus besoin de manuellement rafraichir les données pour en récupérer l'état à l'instant T. 

Un client se verra automatiquement notifé d'une modification en base de données.
Bien qu'il soit possible de demander à l'application cliente de requêter le serveur toutes les x secondes (long polling), il est préférable que le serveur envoie une notification dès que l'état de la donnée à changé.
Vous l'avez compris, les lives queries sont un outil super cool pour les applications front-end.

Le but de cette série d'articles est donc de monter une stack applicative complète en utilisant les lives queries! Notre unité de persistance sera une base de données de type PostgreSQL.

Après quelques recherches, j'ai trouvé trois outils différents pouvant accomplir cette tâche.

A savoir :
 * [Hazura](https://hasura.io/)
 * [PostGraphile](https://www.graphile.org/postgraphile/)
 * [Prisma](https://www.prisma.io/)

Vous trouverez des comparaisons de ces outils sur Reddit par exemple. J'ai choisi d'utiliser PostGraphile car je trouve la solution très légère.
Mais qu'est ce qu'est réellement PostGraphile ? Et quel est le lien entre PostGraphile et es lives queries ?

Voici comment est défini PostGraphile :

>*PostGraphile (formerly PostGraphQL) builds a powerful, extensible and performant GraphQL API from a PostgreSQL schema in seconds; saving you weeks if not months of development time.*

Il s'agit donc d'un outil qui va exposer un schéma PostgreSQL sous forme d'une API GraphQL. PostGraphile détecte automatiquement les tables, colonnes, index, realtions, vues, types, fonctions, commentaires et bien plus. Il construit un serveur GraphQL sur base de tout cela. Le serveur GraphQL se met automatiquement à jour lors de modifications en base de données. Pas besoin de le redémarrer. Les lives queries sont une spécification intégrante de GraphQL. Le serveur GraphQL servira de pont entre la partie serveur et la partie cliente.

Le développment de la stack complète sera découpé en deux articles distincts. Un article pour la partie serveur et un article pour la partie cliente.

Voici la liste des choses que nous allons mettre en place dans cette première partie :

* Une base de données de type PostgreSQL + un client. J'ai choisi PgAdmin 4
* La création d'un schéma SQL via l'outil Knex.js
* La remontée des WAL (Write Applications Logs) 
* Un serveur de type NodeJS sur lequel nous installerons PostGraphile. Nous utiliserons le framework ExpressJS.

Démarrons sans plus attendre!

## Installation de PostgreSQL
 
Commençons par créer et configurer la base. 
Il est important de préciser qu'il est obligatoire d'utiliser une base de données de type PostgreSQL >= 9.4.
Toutes les commandes et manipulations sont effectuées via un système Linux Fedora 31.
L'installation se fait docker et docker-compose. Assurez-vous de disposer de ces deux outils prêts à l'emploi.
Une petite vérification peu se faire via ces deux commandes :

```bash
docker -v
```
```
docker-compose -v
```
&nbsp;  
Me concernant, Docker est en version 19.03.5 et docker-compose en version 1.24.1.
&nbsp;  
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
&nbsp;  
Rien de particulier si ce n'est la ligne :
```yml
- ./postgresql.conf:/etc/postgresql.conf
```
&nbsp;  
Il s'agit de la surchage du fichier `postgresql.conf` par défaut. Etant donné qu'il n'est pas possible d'éditer le fichier dans le conteneur (vim, nano, ... indisponible), nous utilisons cette technique de surcharge.
Veillez donc à avoir votre fichier `postgresql.conf` dans le même dossier que le `docker-compose.yml`.
&nbsp;  
&nbsp;  
Nous devons activer une fonction de PostgreSQL appelée 'Logical Decoding'. 
C'est cette fonction qui va permettre au serveur PostgreSQL d'émettre un stream de données lors de modifications.
&nbsp;  
Il y a trois lignes à décommenter dans le fichier de configuration `postgresql.conf` par defaut.

```
wal_level = logical
max_wal_senders = 10
max_replication_slots = 10
```
&nbsp;  
Si vous ne savez pas comment obtenir le fichier `postgresql.conf` par défaut, une technique consiste en la création du conteneur sans la surcharge. J'explique juste après comment entrer en invite de commandes dans un conteneur. Il ne vous reste plus qu'à consulter le fichier via la commande :
```bash
cat data/postgres/postgresql.conf
```
&nbsp;  
Une fois que tout est prêt, lancez l'installation via la commande suivante :

```bash
docker-compose -f docker-compose.yml up -d
```
&nbsp;  
Faite ensuite un ```docker ps```. Vous devriez voir les deux conteneurs démarrés.

![docker-ps](/assets/docker.png#lightbox=true;display=block;margin-left=auto;margin-right=auto;width=100%)

Il y un a un module supplémentaire à installer sur le serveur de base de données. Il s'agit du module `wal2json`. Retrouvez le projet GitHub [*ici*](https://github.com/eulerto/wal2json).
&nbsp;  
&nbsp;  
Pour l'installer, c'est très simple. Nous allons entrer en `bash` dans le conteneur. Pour cela, récupérez l'id via la commande `docker ps`. `11227694b91e` dans mon cas.
&nbsp;  
&nbsp;  
Ensuite, entrez cette commande : 
```bash
docker exec -it 11227694b91e /bin/bash
```
&nbsp;  
Installons le package via 
```
apt-get install postgresql-13-wal2json
```
&nbsp;  
Une fois le package correctement installé, sortez du conteneur via la commande `exit`.
Il est temps de se connecter à la base pour véfifier que tout est en place.
Rendez-vous sur *http://localhost:5050*.
Le login et mot de passe se situent dans le fichier `docker-compose.yml` (respectivement `postgresql` et `changeme`).

Si vous êtes connecté à l'interface web c'est que tout s'est bien passé.

Vous pouvez faire une vérification en exécutant la fonction suivante :

```SQL
DO $$
BEGIN
  if current_setting('wal_level') is distinct from 'logical' then
    raise exception 'wal_level must be set to ''logical'', your database has it set to ''%''. Please edit your `%` file and restart PostgreSQL.', current_setting('wal_level'), current_setting('config_file');
  end if;
  if (current_setting('max_replication_slots')::int >= 1) is not true then
    raise exception 'Your max_replication_slots setting is too low, it must be greater than 1. Please edit your `%` file and restart PostgreSQL.', current_setting('config_file');
  end if;
  if (current_setting('max_wal_senders')::int >= 1) is not true then
    raise exception 'Your max_wal_senders setting is too low, it must be greater than 1. Please edit your `%` file and restart PostgreSQL.', current_setting('config_file');
  end if;
  perform pg_create_logical_replication_slot('compatibility_test', 'wal2json');
  perform pg_drop_replication_slot('compatibility_test');
  raise notice 'Everything seems to be in order.';
end;
$$ LANGUAGE plpgsql;
```
&nbsp;  
Vous devriez recevoir le message suivant en retour : `NOTICE:  Everything seems to be in order.`
Si tel est le cas, c'est que votre base de données est configurée correctement pour les live queries.
Si au contraire, vous avez une erreur, je vous invite à reparcourir ce guide afin de vérifier que vous n'avez rien oublié.

##Création du serveur NodeJS

Comme expliqué dans l'introduction, nous utiliserons un framework rapide et léger pour NodeJS. J'ai nommé ExpressJS.
Par ici pour la documentation : *https://expressjs.com* 


Premièrement, créer un dossier `server` et déplaçons nous à l'intérieur.

```mkdir server && cd $_```

Créer le projet avec la commande suivante (Vous pouvez accepter les valeurs par défaut).

```npm init```

Un fichier `package.json` a été créé. Installons maintenant les dépendances requises.

>*Dépendances*
&nbsp;  
*```npm i body-parser cors express knex knex-migrate postgraphile pg```*

>*Dépendances dev*
&nbsp;  
*```npm i nodemon dotenv -D```*

Ajoutez les scripts `start` et `watch` au fichier généré `package.json`. Ce qui donne ce résultat :

```json
{
  "name": "server",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node src/index.js",
    "watch": "nodemon src/index.js",
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "body-parser": "^1.19.0",
    "cors": "^2.8.5",
    "express": "^4.17.1",
    "knex": "^0.21.12",
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
&nbsp;  
Pour permettre au serveur de s'éxecuter, nous devons créer le fichier `src/index.js`

```bash
mkdir src && touch src/index.js
```
&nbsp  
Voici le fichier :

```javascript
require('dotenv').config()

const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

const { PORT } = process.env

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```
&nbsp;  
Comme vous pouvez le voir, nous utilisons un fichier `.env` pour gérer les credentials. Ci-dessous notre fichier de référence. Placez-le dans le dossier `server` (racine du projet)

```bash
vi .env
```
```
CLIENT=pg
PORT=8080
ROOT_DATABASE_URL=postgres://postgres:changeme@0.0.0.0/securify
DATABASE=securify
PG_USER=postgres
PASSWORD=changeme
HOST=0.0.0.0
PG_PORT=5432
```
&nbsp;  
ROOT_DATABASE_URL est nécessaire pour les live queries car nous avons besoin d'une élévation de droits pour le décodage logique.
&nbsp;  
Vous pouvez utiliser les commandes suivantes pour démarrer le serveur :

```bash
yarn start
```
&nbsp;  
ou bien
```bash
npm run start
```
&nbsp;  
##Création et exécution du schéma SQL avec Knex-Migrations

A ce stade, voyons comment nous pouvons créer une base de données, un schéma SQL, une table allimentée par quelques données.

Nous utiliserons pour cela les `migrations`

J'ai écris un post séparé pour cela étant donné que c'est une étape optionnelle. Voici le lien : [Gérer vos migrations DB avec Knex](/knex-migrations/)

Voici l'arborecense attendue : 

```
- server
  - db
    - migrations
    - seeds
    knex.js
  - src
    - index.js
  .env
  knexfile.js
```
&nbsp;  
##Intégration et configuration de PostGraphile

Ayant un schéma correctement créé en base et avec quelques données, nous pouvons commencer à utiliser `PostGraphile`. Nous avons déjà installé une partie des packages nécessaires.
La configuration ainsi que l'ajout de la gestion des live queries est très simple, et ne prend que quelques minutes.

Pour pouvoir utiliser les lives queries, il y a deux dépendances à ajouter :

```bash
npm i @graphile/pg-pubsub @graphile/subscriptions-lds
```
&nbsp;  
Créons un nouveau fichier `src/postgraphile.js` constituant les détails de connexion vers notre base de données ainsi que les options `PostGraphile`. 
Pour cela, reprenez le contenu suivant :

```javascript
const { postgraphile } = require('postgraphile');

const postgraphileOptions = {
  watchPg: true,
  graphiql: true,
  enhanceGraphiql: true,
  // Enable live support in PostGraphile
  live: true,
  // We need elevated privileges for logical decoding
  ownerConnectionString: process.env.ROOT_DATABASE_URL,
  // Add this plugin
  appendPlugins: [
    //...
    require('@graphile/subscriptions-lds').default,
  ],
};

const { DATABASE, PG_USER, PASSWORD, HOST, PG_PORT } = process.env;

module.exports = postgraphile(
  {
    database: DATABASE,
    user: PG_USER,
    password: PASSWORD,
    host: HOST,
    port: PG_PORT,
  },
  'public',
  postgraphileOptions
);
```
&nbsp;  
Ensuite, importons-le dans notre fichier `src/index.js` en y ajoutant la ligne suivante :

```javascript
const postgraphile = require('./postgraphile')
```

La dernière étape est de l'intégrer avec notre application.

```javascript
app.use(postgraphile)
```
&nbsp;  
Notre fichier `src/index.js` devrait finalement correspondre à ceci :

```javascript
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
&nbsp;  
Finalement, démarrons notre server avec `npm run start` et rendez-vous sur l'URL suivante pour accéder à `Graphiql` : [http://localhost:8080/graphiql](http://localhost:8080/graphiql)

C'est un client dans lequel vous pouvez saisir vos requêtes. Il existe un autre client que j'aime utiliser : [graphql-playground](https://github.com/graphql/graphql-playground)

Dans la partie gauche, encodez cette requête :

```
subscription getUsers {
    allUsers {
      nodes {
        email
        id
        name
        createdAt
      }
    }
  }
```

Cliquez sur le bouton play. Vous devriez voir apparaitre le résusltat suivant :

```
{
  "data": {
    "allUsers": {
      "nodes": [
        {
          "email": "bertrand.deweer@gmail.com",
          "id": 1,
          "name": "Bertrand Deweer",
          "createdAt": "2020-10-31T23:52:16.101957+00:00"
        }
      ]
    }
  }
}
```
&nbsp;  
Vous avez exécuté une `subscription`. Le client reste en écoute permanente. 
&nbsp;  
Retournez dans `PgAdmin`, dans la table `users` et modifiez la valeur actuelle par votre nom. Sauvegardez (F6).
&nbsp;  
Le client GraphQL se voit automatiquement notifié avec le changement correspondant!
&nbsp;  
&nbsp;  
Voici pour la partie serveur! Félicitations si vous êtes parvenu jusqu'ici! 
&nbsp;  
Vous disposez d'un serveur `GraphQL` connecté à un serveur `PostgreSQL` via `PostGraphile`.
&nbsp;  
&nbsp;  
Dans la seconde partie, nous allons créer un client pour notre application. Nous utiliserons React + TypeScript, GraphQL et Apollo pour construire le client.

