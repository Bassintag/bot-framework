import 'reflect-metadata';
import { Container, interfaces } from 'inversify';
import { IDENTIFIERS } from './constants/identifiers';
import { Repository, Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { Type } from './utils/type';
import { ILogger, Logger, LogLevel } from './utils/logger';
import { RESOURCE_NAMES } from './constants/resource-names';
import { SettingsMetadata } from './resource/settings-metadata';
import { ISettingsService, SettingsService } from './services/settings-service';
import { IResourceService, ResourceService } from './services/resource-service';
import { Bot, IBot } from './bot';
import { IMethodBinder, MethodBinder } from './controllers/method-binder';
import { ElectronMethodBinder } from './controllers/impl/electron-method-binder';
import { IController } from './controllers/controller';
import { ISettingsKey } from './domain/settings-key';
import { SettingsController } from './controllers/settings-controller';
import { IWindowService, WindowService } from './services/window-service';
import { IEventPublisher } from './events/event-publisher';
import { EventManager, IEventManager } from './events/event-manager';
import { ElectronEventPublisher } from './events/impl/electron-event-publisher';
import { IMigration } from './migrations/migration';
import { IMigrationManager, MigrationManager } from './migrations/migration-manager';
import { IEntityManager } from './entity-manager';
import { BaseMigration } from './migrations/impl/base-migration';
import { ITaskService } from './services/task-service';
import { ITask } from './task/task';
import { IOnInit } from './utils/on-init';
import { IUpdateManager, UpdateManager } from './update/update-manager';
import { UpdateController } from './controllers/update-controller';
import Factory = interfaces.Factory;

export interface IResourceDefinition<T = any> {
	name: string;
	class: any;
	service?: any;
}

export interface ITaskType<T = any> {
	name: string;
	class: Type<ITask<T>>;
	service?: Type<ITaskService<T>>;
}

export interface IContainerOptions {
	entityManagerOptions?: SequelizeOptions; // Entity Manager config
	logger?: Type<ILogger>; // Logger implementation
	debug?: boolean; // Enable debug mode
	controllerMethodBinders?: Type<IMethodBinder>[]; // Controller method binder (default is electron ipc events)
	settingsKeys?: ISettingsKey[]; // Valid settings keys
	resources?: IResourceDefinition[]; // Resources to load
	controllers?: Type<IController>[]; // Controllers to load
	eventPublishers?: Type<IOnInit & IEventPublisher>[]; // Event publishers to load
	migrations?: Type<IMigration>[]; // DB Migrations
	taskTypes?: ITaskType[]; // Task Types
	bootstrap?: Type<IOnInit>[]; // Bootstrap
	enableUpdates?: boolean; // Enable updates
}

export interface IContainerManager {
	bind(): void;
}

export class ContainerManager implements IContainerManager {
	private readonly $container: Container;

	get container(): Container {
		return this.$container;
	}

	constructor(private readonly $config: IContainerOptions) {
		this.$container = new Container();
	}

	bind(): void {
		// Bind bot
		this.$container.bind<IBot>(IDENTIFIERS.BOT).to(Bot);

		// Bind debug
		const debug = this.$config.debug || false;
		this.$container.bind<boolean>(IDENTIFIERS.DEBUG).toConstantValue(debug);

		// Bind logger and log level
		const logLevel = this.$config.debug ? LogLevel.ALL : LogLevel.INFO;
		this.$container.bind<LogLevel>(IDENTIFIERS.LOG_LEVEL).toConstantValue(logLevel);
		const loggerClass = this.$config.logger || Logger;
		this.$container.bind<ILogger>(IDENTIFIERS.LOGGER).to(loggerClass).inSingletonScope();

		// Bind entity manager
		const entityManagerConfig = this.$config.entityManagerOptions || {
			database: 'bot',
			dialect: 'sqlite',
			username: 'root',
			password: '',
			logging: debug,
			storage: './database.sqlite3',
		};
		entityManagerConfig.repositoryMode = true; // Enable repository mode
		entityManagerConfig.models = []; // Models are loaded later
		const entityManager = new Sequelize(entityManagerConfig);
		this.$container.bind<IEntityManager>(IDENTIFIERS.ENTITY_MANAGER).toConstantValue(entityManager);

		// Load resources along with services and controllers
		const methodBinders = this.$config.controllerMethodBinders || [ElectronMethodBinder];
		for (const methodBinder of methodBinders) {
			this.container.bind<IMethodBinder>(IDENTIFIERS.CONTROLLER_METHOD_BINDER).to(methodBinder).inSingletonScope();
		}
		this.container.bind<IMethodBinder>(IDENTIFIERS.METHOD_BINDER).to(MethodBinder).inSingletonScope();
		const resources = this.$config.resources || [];
		resources.push({
			name: RESOURCE_NAMES.SETTINGS_METADATA,
			class: SettingsMetadata,
			service: ResourceService,
		});
		entityManager.addModels(resources.map((r) => r.class));
		for (const resource of resources) {
			const repository = entityManager.getRepository(resource.class);
			this.$container
				.bind<Repository<any>>(IDENTIFIERS.REPOSITORY)
				.toConstantValue(repository)
				.whenTargetNamed(resource.name);
			if (resource.service) {
				this.$container
					.bind<IResourceService<any>>(IDENTIFIERS.RESOURCE_SERVICE)
					.to(resource.service)
					.inSingletonScope()
					.whenTargetNamed(resource.name);
			}
		}

		// Bind controllers
		const controllers = this.$config.controllers || [];
		if (this.$config.enableUpdates) {
			controllers.push(UpdateController);
		}
		controllers.push(SettingsController);

		// Bind events
		this.$container.bind<IEventManager>(IDENTIFIERS.EVENT_MANAGER).to(EventManager).inSingletonScope();

		// Bind update
		if (this.$config.enableUpdates) {
			this.$container.bind<IUpdateManager>(IDENTIFIERS.UPDATE_MANAGER).to(UpdateManager).inSingletonScope();
		}

		// Settings keys
		const settingsKeys = this.$config.settingsKeys || [];
		this.$container.bind<ISettingsKey[]>(IDENTIFIERS.SETTINGS_KEYS).toConstantValue(settingsKeys);

		// Load and bind services
		this.$container.bind<ISettingsService>(IDENTIFIERS.SETTINGS_SERVICE).to(SettingsService).inSingletonScope();
		this.$container.bind<IWindowService>(IDENTIFIERS.WINDOW_SERVICE).to(WindowService).inSingletonScope();

		// Migrations
		const migrations = this.$config.migrations || [];
		migrations.push(BaseMigration);
		for (const migration of migrations) {
			this.$container.bind<IMigration>(IDENTIFIERS.MIGRATION).to(migration).inSingletonScope();
		}
		this.$container.bind<IMigrationManager>(IDENTIFIERS.MIGRATION_MANAGER).to(MigrationManager).inSingletonScope();

		// Task Types
		const taskTypes = this.$config.taskTypes || [];
		for (const taskType of taskTypes) {
			const service = taskType.service;
			if (service != null) {
				this.$container
					.bind<ITaskService<any>>(IDENTIFIERS.TASK_SERVICE)
					.to(service)
					.inSingletonScope()
					.whenTargetNamed(taskType.name);
			}
			this.$container.bind<ITask>(IDENTIFIERS.TASK_PROCESS).to(taskType.class).whenTargetNamed(taskType.name);
			this.$container
				.bind<Factory<ITask>>(IDENTIFIERS.TASK_PROCESS_FACTORY)
				.toFactory<ITask>((context) => {
					return (model: any, scriptPath: string) => {
						const instance = context.container.getNamed<ITask>(IDENTIFIERS.TASK_PROCESS, taskType.name);
						instance.init(model, scriptPath);
						return instance;
					};
				})
				.whenTargetNamed(taskType.name);
		}

		// Bootstrap
		const bootstrap = this.$config.bootstrap || [];
		const eventPublishers = this.$config.eventPublishers || [ElectronEventPublisher];
		bootstrap.push(...eventPublishers);
		bootstrap.push(...controllers);
		console.log(bootstrap);
		for (const module of bootstrap) {
			this.$container.bind<IOnInit>(IDENTIFIERS.BOOTSTRAP).to(module).inSingletonScope();
		}
	}
}
