import {
  DataSourceCustomizer,
  DataSourceOptions,
  TSchema,
} from '@forestadmin/datasource-customizer';
import PublicationDataSourceDecorator from '@forestadmin/datasource-customizer/dist/decorators/publication/datasource';
import RenameCollectionDataSourceDecorator from '@forestadmin/datasource-customizer/dist/decorators/rename-collection/datasource';
import { DataSource, DataSourceFactory } from '@forestadmin/datasource-toolkit';

export default class RpcDataSourceCustomizer<
  S extends TSchema = TSchema,
> extends DataSourceCustomizer<S> {
  override addDataSource(
    factory: DataSourceFactory,
    options?: DataSourceOptions,
    restartAgentFunction?: () => Promise<void>,
    markCollectionsAsRpc?: (datasource: DataSource) => void,
  ): this {
    this.stack.queueCustomization(async logger => {
      let dataSource = await factory(logger, restartAgentFunction);

      if (options?.include || options?.exclude) {
        const publicationDecorator = new PublicationDataSourceDecorator(dataSource, logger);
        publicationDecorator.keepCollectionsMatching(options.include, options.exclude);
        dataSource = publicationDecorator;
      }

      if (options?.rename) {
        const renamedDecorator = new RenameCollectionDataSourceDecorator(dataSource);
        renamedDecorator.renameCollections(options.rename);
        dataSource = renamedDecorator;
      }

      if (markCollectionsAsRpc) {
        markCollectionsAsRpc(dataSource);
      }

      this.compositeDataSource.addDataSource(dataSource);
    });

    return this;
  }
}
