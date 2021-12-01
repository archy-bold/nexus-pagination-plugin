import { arg, dynamicOutputMethod, objectType, plugin } from 'nexus';
import {
  AllNexusNamedOutputTypeDefs,
  FieldOutConfig,
  FieldResolver,
  GetGen,
} from 'nexus/dist/core';
import { printedGenTypingImport } from 'nexus/dist/utils';

export interface PaginationParams {
  skip: number;
  take: number;
}

interface CustomPaginationResolveContextFields {
  /**
   * Variables that can be passed to prisma
   * @interface {skip: number, take: number}
   */
  paginationParams: PaginationParams;
  /**
   * Calculates the page info
   * @param count total count of items in table
   * @returns {page: number, nextPage: number, totalPages: number}
   */
  calculatePageInfo: (count: number) => {
    page: number;
    nextPage: number;
    totalPages: number;
  };
}

type PaginationResolveArgs<TypeName extends string, FieldName extends string> = Parameters<
  FieldResolver<TypeName, FieldName>
>;
type PaginationResolveReturn<TypeName extends string, FieldName extends string> = ReturnType<
  FieldResolver<TypeName, FieldName>
>;
/** Redefine the default resolve function to include our custom context types */
export type PaginationResolve<TypeName extends string, FieldName extends string> = (
  root: PaginationResolveArgs<TypeName, FieldName>[0],
  args: PaginationResolveArgs<TypeName, FieldName>[1],
  ctx: PaginationResolveArgs<TypeName, FieldName>[2] & CustomPaginationResolveContextFields,
  info: PaginationResolveArgs<TypeName, FieldName>[3]
) => PaginationResolveReturn<TypeName, FieldName>;

/** Define the query field config to extend the default */
export type PaginatedQueryFieldConfig<
  TypeName extends string = any,
  FieldName extends string = any
> = Omit<FieldOutConfig<TypeName, FieldName>, 'resolve' | 'type'> & {
  type: GetGen<'allOutputTypes', string> | AllNexusNamedOutputTypeDefs;
  resolve: PaginationResolve<TypeName, FieldName>;
} & PaginationFieldPluginOptions;

/** Fields that are available on the global config and field config  */
interface SharedPluginOptions {
  /**
   * Change the default page size
   * @default 25
   * */
  defaultPageSize?: number;
}

interface PaginationPluginOptions extends SharedPluginOptions {
  /**
   * Use a different name for the generated type
   * @default Paginated{fieldName}s
   * @param targetTypeName the type of the model we are pagination
   * @returns {string}
   * */
  getGeneratedTypename?: (targetTypeName: string) => string;
}

type PaginationFieldPluginOptions = SharedPluginOptions;

const DEFAULT_PAGE_SIZE = 25;

const getDefaultGeneratedTypename = (targetTypeName: string) => {
  return `Paginated${targetTypeName}s`;
};

/**
 * A nexus plugin to help with offset/limit pagination, used with `t.paginatedQueryField`
 * Automatically generates pagination fields for a model.
 * Adds functions to get the params and calculate page info to the context object.
 */
export const paginationPlugin = (config: PaginationPluginOptions = {}) => {
  const {
    defaultPageSize = DEFAULT_PAGE_SIZE,
    getGeneratedTypename = getDefaultGeneratedTypename,
  } = config;

  return plugin({
    name: 'PaginationPlugin',
    description: 'Add the ability to create paginated query fields',
    fieldDefTypes: [
      // Add PaginatedQueryFieldConfig to generated types
      printedGenTypingImport({
        module: 'graphql/pagination-plugin',
        bindings: ['PaginatedQueryFieldConfig'],
      }),
    ],
    onInstall(builder) {
      // Add PageInfo type
      builder.addType(
        objectType({
          name: 'PageInfo',
          description: 'Pagination info',
          definition(t) {
            t.int('page');
            t.int('nextPage');
            t.int('totalPages');
          },
        })
      );

      builder.addType(
        // Add t.paginatedQueryField method
        dynamicOutputMethod({
          name: 'paginatedQueryField',
          typeDescription: 'Creates a paginated query field',
          // type definition for our function
          typeDefinition: `
            <FieldName extends string>(
              fieldName: FieldName,
              config: PaginatedQueryFieldConfig<TypeName, FieldName>
            ): void
          `,
          factory({
            // query field type definition
            typeDef: t,
            // args passed to t.paginatedQueryField
            args: factoryArgs,
            builder,
          }) {
            const [fieldName, fieldConfig] = factoryArgs as [string, PaginatedQueryFieldConfig];

            const targetTypeName =
              typeof fieldConfig.type === 'string'
                ? fieldConfig.type
                : (fieldConfig.type.name as string);

            const generatedTypeName = getGeneratedTypename(targetTypeName);

            if (!builder.hasType(generatedTypeName)) {
              builder.addType(
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
              );
            }

            t.field(fieldName, {
              ...fieldConfig,
              // override resolve function to add pagination logic
              resolve: (...props) => {
                const [root, args, context, info] = props as any;
                const { page, pageSize } = args;
                const skip = (page - 1) * pageSize;
                const take = pageSize;

                const paginationParams = {
                  skip,
                  take,
                };

                const calculatePageInfo = (count: number) => {
                  const totalPages = Math.ceil(count / pageSize);
                  const nextPage = page + 1 <= totalPages ? page + 1 : null;

                  return {
                    page,
                    nextPage,
                    totalPages,
                  };
                };

                const paginationContext = {
                  paginationParams,
                  calculatePageInfo,
                };

                return fieldConfig.resolve(
                  root,
                  args,
                  {
                    ...context,
                    ...paginationContext,
                  },
                  info
                );
              },
              // not sure why we need to cast this as any
              type: generatedTypeName as any,
              args: {
                // pass through args from field config
                ...fieldConfig.args,
                // add pagination args
                page: arg({ type: 'Int', default: 1 }),
                pageSize: arg({
                  type: 'Int',
                  default: fieldConfig.defaultPageSize || defaultPageSize,
                }),
              },
            });
          },
        })
      );
    },
  });
};
