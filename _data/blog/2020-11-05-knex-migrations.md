---
template: BlogPost
path: /knex-migrations
date: 2020-11-05T20:43:50.738Z
title: Gérer vos migrations DB avec Knex
thumbnail: /assets/migrations.png
metaDescription: knexmigrations
---

## Introduction

>Avant de commencer, précisions que cet article est un sous-post de [Les lives queries pour une application web réactive - Partie 1](/live-queries-server). Soyez certain d'avoir un serveur PostgreSQL en cours d'exécution sur votre ordinateur.

[Knex.js](http://knexjs.org) est un constructeur de requêtes pour PostgreSQL, MSSQL, MySQL, MariaDB, SQLite3, Oracle et Amazon Redshift. C'est flexible, portable et fun à utiliser. Nous allons l'utiliser pour maintenir notre schéma de base de données.

![Alt text here](/assets/knex.png#lightbox=true;display=block;margin-left=auto;margin-right=auto;width=50%)

`Knex-migrate` garde un oeil sur vos changements de schémas et données, ce qui est très utile lors de migration de base de données. `Knex-migrate` dispose de tous les fichiers et logs. Nous n'avons donc qu'à exécuter une commande et `knex-migrate` prendra soin de construire tous les schémas et les entrées de données statiques dans la base de données.

Un avantage majeur est que nous pouvons cloner notre projet dans un nouvel environnement pour ensuite exécuter les scripts knex migrations. Knex prendra soin de tout le reste.

Démarrons donc avec notre création de schéma à l'aide de `knex-migrate`. Nous devons être certain d'avoir `knex` et `knex-migrate` installés dans notre projet. Si pas, nous devons exécuter la commande suivante :



```bash
npm install knex knex-migrate
```
&nbsp;  
Lançons ensuite l'initialisation avec : 

```npx
npx knex init
```
&nbsp;  
Cette commande a pour effet de générer le fichier `knexfile.js`. C'est un fichier auto-généré par `knex`, lequel inclus toutes les configurations pour se connecter à la base de données selon l'environnement tel que développement, recette, pré-production, production. J'ai mis à jour la section développement. Le fichier doit donc ressembler à ceci :

```javascript
require('dotenv').config()

const { CLIENT, DATABASE, PG_USER, PASSWORD, HOST, PG_PORT } = process.env

module.exports = {
    development: {
        client: CLIENT,
        connection: {
            database: DATABASE,
            user: PG_USER,
            password: PASSWORD,
            host: HOST,
            port: PG_PORT,
        },
        migrations: {
            directory: __dirname + '/db/migrations',
        },
        seeds: {
            directory: __dirname + '/db/seeds',
        },
    },

    staging: {
        client: 'postgresql',
        connection: {
            database: 'my_db',
            user: 'username',
            password: 'password',
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'knex_migrations',
        },
    },

    production: {
        client: 'postgresql',
        connection: {
            database: 'my_db',
            user: 'username',
            password: 'password',
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'knex_migrations',
        },
    },
}
```
&nbsp;  
Voici également le fichier `.env` faisant référence.
&nbsp;  
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
Mettez à jour ces valeurs selon la configuration de votre base de données et de votre environnement. Suivant ce fichier de configuration, vous devez créer les dossiers `migrations` et `seeds` sous le dossier `db` que vous devez également créer.

`migrations` contiendra les fichiers déterminants notre schéma. `seeds` contiendra les fichiers contenant nos données à mettre à jour dans la base de données.
&nbsp;  
A présent, pour utiliser la configuration de connexion avec `knex`, nous devons créer le fichier `knex.js` dans `db`. Ce fichier exportera un module de connexions basé sur l'environnement.

```javascript
const environment = process.env.NODE_ENV || 'development'
const config = require('../knexfile')[environment]
module.exports = require('knex')(config)
```
&nbsp;  
A présent, notre arborécense devrait ressemble à ceci :

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
A ce stade, nous allons créer les tables dans notre base de données en utilisant `knex-migrate`. Les données seront également insérées. Pour plus d'informations concernant `knex schema`, rendez-vous sur : [http://knexjs.org/#Schema](http://knexjs.org/#Schema)
&nbsp;  
Afin de créer la migration de schéma, nous avons besoin de lancer la commande qui créera un fichier auto-généré sous la dossier migration avec un date timestamp dans le nom de fichier.

Par exemple : *20201031221921_migration_create_table.js*

Voici la commande en question :

```bash
knex migrate:make migration_create_table
```
&nbsp;  
Voici le fichier *`20201031221921_migration_create_table.js`* avec les détails du schéma attendu.

```javascript
exports.up = function(knex) {
    return knex.schema
        .createTable('users', function(table) {
            table.increments().primary()
            table.string('name', 255).notNullable()
            table.string('email', 255).notNullable()
            table.string('password', 255).notNullable()
            table
                .boolean('account_verified')
                .notNullable()
                .defaultTo(false)
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
        .createTable('posts', function(table) {
            table.increments().primary()
            table.string('title', 255).notNullable()
            table.string('body', 255).notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table
                .integer('user_id')
                .references('id')
                .inTable('users')
        })
        .createTable('comments', function(table) {
            table.increments().primary()
            table.string('comment', 255).notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table
                .integer('user_id')
                .references('id')
                .inTable('users')
            table.string('user_name', 255).notNullable()
            table
                .integer('post_id')
                .references('id')
                .inTable('posts')
        })
}

exports.down = function(knex) {
    return knex.schema.dropTable('posts').dropTable('users').dropTable('comments')
}
```
&nbsp;  
Afin de mettre à jour ce schéma vers notre base de données `PostgreSQL`, nous devons exécuter la commande suivante :

```bash
npx knex migrate:latest
```
&nbsp;  
Retournons dans `PgAdmin` afin de voir que la commande `knex-migrate` a correctement créé les tables en accord avec le schéma configuré.


![Alt text here](/assets/knex-migrate.png#lightbox=true;display=block;margin-left=auto;margin-right=auto;width=20%)


Maintenant que nos tables sont prêtes, nous pouvons y insérer des données en utilisant `seeds`. Nous allons créer deux fichier seeds ; un pour l'utilisateur et un autre pour le post. Voici les commandes et fichiers d'exemples créés.

```bash
npx knex seed:make 01_users
```

```bash
npx knex seed:make 02_posts
```
&nbsp;  
Contrairement à la commande `migration`, ces commandes vont créer des fichiers auto-générés dans `seeds`.

Dans notre cas : *`01_users.js`* et *`02_posts.js`*

Une chose importante à retenir est que le nom des fichiers `seeds` doivent démarrer avec un nombre incrémental. Plus de détails ici : [http://knexjs.org/#Seeds-CLI](http://knexjs.org/#Seeds-CLI).

Voici les fichiers `seeds` d'exemple créés pour insérer des utilisateurs avec un blog lui étant associé.

```javascript
exports.seed = function(knex) {
    // Deletes ALL existing entries
    return knex('users')
        .del()
        .then(function() {
            // Inserts seed entries
            return knex('users').insert([
                {
                    id: 1,
                    name: 'Bertrand Deweer',
                    email: 'bertrand.deweer@gmail.com',
                    password: 'bertrand',
                },
            ])
        })
}
```

```javascript
exports.seed = function(knex) {
    // Deletes ALL existing entries
    return knex('posts')
        .del()
        .then(function() {
            // Inserts seed entries
            return knex('posts').insert([
                {
                    id: 1,
                    title: 'Sample blog',
                    body:
                        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec elementum mi purus, dignissim faucibus lectus pulvinar vitae.',
                    user_id: 1,
                },
            ])
        })
}
```
&nbsp;  
J'utilise la fonction `del()` afin de supprimer les entrées existantes. Vous pouvez supprimer cette instruction lors d'un script de mise à jour.

Lançons à présent la commande suivante pour exécuter les fichiers seeds :

```bash
npx knex seed:run
```
&nbsp;  
![Alt text here](/assets/users.png#lightbox=true;display=block;margin-left=auto;margin-right=auto;width=100%)



![Alt text here](/assets/posts.png#lightbox=true;display=block;margin-left=auto;margin-right=auto;width=100%)

J'espère que cet article vous aura donné une idée de ce que pouvez faire avec `knex-migrate` pour la construction de vos schémas et pour vous permettre de suivre leurs évolutions.

Merci!