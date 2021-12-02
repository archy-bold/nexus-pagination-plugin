# nexus-pagination-plugin

The pagination plugin provides a new method on the object definition builder, enabling paginated associations between types, following the offset-based pagination standard defined below.

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
yarn add nexus-plugin-shield
```
or
```
npm install nexus-plugin-shield
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
