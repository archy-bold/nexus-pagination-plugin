# nexus-pagination-plugin

<br />
<p align="center">
  <a href="https://echobind.com">
    <img src="https://camo.githubusercontent.com/d22763c73585cf5d4cf87534659689c2a6b3f214/68747470733a2f2f7265732d332e636c6f7564696e6172792e636f6d2f6372756e6368626173652d70726f64756374696f6e2f696d6167652f75706c6f61642f635f6c7061642c685f3235362c775f3235362c665f6175746f2c715f6175746f3a65636f2f76313439393437333135312f68326b3233696f6f3479687230676a746f636d792e6a7067" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">nexus-pagination-plugin</h3>
</p>
<div align="center">
  <a href="https://www.npmjs.com/package/nexus-pagination-plugin">
    <img alt="NPM version." src="https://img.shields.io/npm/v/nexus-pagination-plugin" />
  </a>
  <img alt="License." src="https://img.shields.io/github/license/echobind/react-native-template">
</div>
<hr style="margin-bottom:30px;" >

This pagination plugin provides a new method on the object definition builder, enabling paginated associations between types, following the offset-based pagination standard defined below.

## Offset-Based Pagination Standard

A paginated query field should receive two arguments:

* `page`
  * The current page being request. Defaults to 1
* `pageSize`
  * The size of pages being used. Defaults to 25

A paginated query field should return a type that contains the following:

* `results`
  * A collection of the data requested
* `pageInfo`
  * A type that contains information about the pagination
  * `page`
  * `nextPage`
  * `totalPages`

## Installation

```
yarn add nexus-pagination-plugin
```
or
```
npm install nexus-pagination-plugin
```

## Setup

```ts
import { makeSchema} from 'nexus';
import { paginationPlugin } from 'nexus-pagination-plugin';

export const schema = makeSchema({
  // ... types, etc,
  plugins: [
    // ... other plugins
    paginationPlugin()
  ],
});

```

## Example Usage

This plugin surfaces a `t.paginatedQueryResult` function that can be used to add pagination to a given type.

```ts
// User Type
export const User = objectType({
  name: 'User',
  description: 'A User',
  definition(t) {
    t.nonNull.id('id');
    t.nonNull.string('firstName');
    t.nonNull.string('lastName');
  },
});

// add paginated users query
export const UsersQuery = queryField((t) => {
  t.paginatedQueryResult('users', {
    type: 'User',
    resolve: async (_root, args, ctx) => {
      const { take, skip } = ctx.paginationParams;

      const users = await ctx.prisma.user.findMany({
        skip,
        take,
      });
      const usersCount = await ctx.prisma.user.count();
      const pageInfo = ctx.calculatePageInfo(usersCount);

      return {
        results: users,
        pageInfo
      }
    },
  })
})
```

## `resolve: (root, args, ctx) => ...`

`t.paginatedQueryResult` wraps the resolve function passed in the query config and adds the following fields on the context object.

### `ctx.paginationParams: {take: number, skip: number}`
  
* `take` specifies the page size
* `skip` specifies how many to skip based on the page size and page arguments
  
### `ctx.calculatePageInfo: (count: number) => PageInfo`

* `count` specifies the total count of records in the DB
* Returns type [`PageInfo`](#pageinfo)

## Generated Types

### `PageInfo`

```ts
objectType({
  name: 'PageInfo',
  definition(t) {
    t.int('page');
    t.int('nextPage');
    t.int('totalPages');
  },
})
```

### `Paginated${targeTypename}s`

```ts
objectType({
  name: generatedTypeName,
  definition(t2) {
    t2.nonNull.list.field('results', {
      type: fieldConfig.type,
      description: `Collection of ${fieldName}`,
    });

    t2.nonNull.field('pageInfo', {
      type: 'PageInfo',
      description: 'Pagination information',
    });
  },
})
```

For a paginated field defined on `Query` like this:

```ts
queryField((t) => {
  t.paginatedQueryField('foos', {
    type: 'Foo',
    // ... any additional query config
  });
});
```

The following types would be generated:

```gql
type PageInfo {
  nextPage: Int
  page: Int
  totalPages: Int
}

type PaginatedFoos {
  pageInfo: PageInfo!
  results: [Foo]!
}

type Query {
  """ ... other Query fields """

  foos(
    page: Int = 1,
    pageSize: Int = 25
  ): PaginatedFoos
}
```

Note that the collection type will be added to whatever parent type is specified. This means that if you were to define a paginated field on another object rather than on `Query` like this:

```ts
objectType({
  type: 'Bar',
  definition(t) {
    // ... other definitions
    t.paginatedQueryField('foos', {
      type: 'Foo',
      // ... any additional query config
    });
  }
})
```

The `foos` query would be added to the `Bar` type rather than the `Query` type:

```gql
type Bar {
  """ ... other Bar fields """

  foos(
    page: Int = 1
    pageSize: Int = 25
  ): PaginatedFoos
}
```

## Options

### `defaultPageSize: number`

Used to specify a different default for the generated `pageSize` argument. Defaults to 25

Global usage:

```ts
paginationPlugin({
  defaultPageSize: 10
})
```

Field usage:

```ts
export const UsersQuery = queryField((t) => {
  t.paginatedQueryResult('users', {
    // ... any additional query fields
    defaultPageSize: 10
  })  
})
```

### `getGeneratedTypename: (targetTypename: string) => string`

Used to specify a different generated typename for the paginated types. Defaults to `Paginated${targetTypename}s`

Usage:

```ts
paginationPlugin({
  getGeneratedTypename: (targetTypename) => `${targetTypename}sPaginated`
})
```

### `generatedTypename: string`

Used to specify a different generated typename for a specific field. Defaults to `Paginated${targetTypename}s` or whatever is defined by `getGeneratedTypename`

Usage:

```ts
export const FinishesQuery = queryField((t) => {
  t.paginatedQueryResult('finishes', {
    type: 'Finish',
    // ... any additional query fields
    generatedTypename: 'PaginatedFinishes'
  })
})
```