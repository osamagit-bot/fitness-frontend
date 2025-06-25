-- MySQL dump 10.13  Distrib 9.3.0, for Win64 (x86_64)
--
-- Host: localhost    Database: fitnessgym
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',2,'add_permission'),(6,'Can change permission',2,'change_permission'),(7,'Can delete permission',2,'delete_permission'),(8,'Can view permission',2,'view_permission'),(9,'Can add group',3,'add_group'),(10,'Can change group',3,'change_group'),(11,'Can delete group',3,'delete_group'),(12,'Can view group',3,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add Token',6,'add_token'),(22,'Can change Token',6,'change_token'),(23,'Can delete Token',6,'delete_token'),(24,'Can view Token',6,'view_token'),(25,'Can add Token',7,'add_tokenproxy'),(26,'Can change Token',7,'change_tokenproxy'),(27,'Can delete Token',7,'delete_tokenproxy'),(28,'Can view Token',7,'view_tokenproxy'),(29,'Can add User',8,'add_customuser'),(30,'Can change User',8,'change_customuser'),(31,'Can delete User',8,'delete_customuser'),(32,'Can view User',8,'view_customuser'),(33,'Can add faq category',9,'add_faqcategory'),(34,'Can change faq category',9,'change_faqcategory'),(35,'Can delete faq category',9,'delete_faqcategory'),(36,'Can view faq category',9,'view_faqcategory'),(37,'Can add product',10,'add_product'),(38,'Can change product',10,'change_product'),(39,'Can delete product',10,'delete_product'),(40,'Can view product',10,'view_product'),(41,'Can add support ticket',11,'add_supportticket'),(42,'Can change support ticket',11,'change_supportticket'),(43,'Can delete support ticket',11,'delete_supportticket'),(44,'Can view support ticket',11,'view_supportticket'),(45,'Can add Member',12,'add_member'),(46,'Can change Member',12,'change_member'),(47,'Can delete Member',12,'delete_member'),(48,'Can view Member',12,'view_member'),(49,'Can add announcement',13,'add_announcement'),(50,'Can change announcement',13,'change_announcement'),(51,'Can delete announcement',13,'delete_announcement'),(52,'Can view announcement',13,'view_announcement'),(53,'Can add challenge',14,'add_challenge'),(54,'Can change challenge',14,'change_challenge'),(55,'Can delete challenge',14,'delete_challenge'),(56,'Can view challenge',14,'view_challenge'),(57,'Can add faq',15,'add_faq'),(58,'Can change faq',15,'change_faq'),(59,'Can delete faq',15,'delete_faq'),(60,'Can view faq',15,'view_faq'),(61,'Can add notification',16,'add_notification'),(62,'Can change notification',16,'change_notification'),(63,'Can delete notification',16,'delete_notification'),(64,'Can view notification',16,'view_notification'),(65,'Can add post',17,'add_post'),(66,'Can change post',17,'change_post'),(67,'Can delete post',17,'delete_post'),(68,'Can view post',17,'view_post'),(69,'Can add comment',18,'add_comment'),(70,'Can change comment',18,'change_comment'),(71,'Can delete comment',18,'delete_comment'),(72,'Can view comment',18,'view_comment'),(73,'Can add ticket response',19,'add_ticketresponse'),(74,'Can change ticket response',19,'change_ticketresponse'),(75,'Can delete ticket response',19,'delete_ticketresponse'),(76,'Can view ticket response',19,'view_ticketresponse'),(77,'Can add trainer',20,'add_trainer'),(78,'Can change trainer',20,'change_trainer'),(79,'Can delete trainer',20,'delete_trainer'),(80,'Can view trainer',20,'view_trainer'),(81,'Can add training',21,'add_training'),(82,'Can change training',21,'change_training'),(83,'Can delete training',21,'delete_training'),(84,'Can view training',21,'view_training'),(85,'Can add training schedule',22,'add_trainingschedule'),(86,'Can change training schedule',22,'change_trainingschedule'),(87,'Can delete training schedule',22,'delete_trainingschedule'),(88,'Can view training schedule',22,'view_trainingschedule'),(89,'Can add purchase',23,'add_purchase'),(90,'Can change purchase',23,'change_purchase'),(91,'Can delete purchase',23,'delete_purchase'),(92,'Can view purchase',23,'view_purchase'),(93,'Can add web authn credential',24,'add_webauthncredential'),(94,'Can change web authn credential',24,'change_webauthncredential'),(95,'Can delete web authn credential',24,'delete_webauthncredential'),(96,'Can view web authn credential',24,'view_webauthncredential'),(97,'Can add Attendance',25,'add_attendance'),(98,'Can change Attendance',25,'change_attendance'),(99,'Can delete Attendance',25,'delete_attendance'),(100,'Can view Attendance',25,'view_attendance');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `authtoken_token`
--

DROP TABLE IF EXISTS `authtoken_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authtoken_token` (
  `key` varchar(40) NOT NULL,
  `created` datetime(6) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `authtoken_token_user_id_35299eff_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authtoken_token`
--

LOCK TABLES `authtoken_token` WRITE;
/*!40000 ALTER TABLE `authtoken_token` DISABLE KEYS */;
/*!40000 ALTER TABLE `authtoken_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_customuser_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (1,'admin','logentry'),(3,'auth','group'),(2,'auth','permission'),(6,'authtoken','token'),(7,'authtoken','tokenproxy'),(4,'contenttypes','contenttype'),(5,'sessions','session'),(13,'users','announcement'),(25,'users','attendance'),(14,'users','challenge'),(18,'users','comment'),(8,'users','customuser'),(15,'users','faq'),(9,'users','faqcategory'),(12,'users','member'),(16,'users','notification'),(17,'users','post'),(10,'users','product'),(23,'users','purchase'),(11,'users','supportticket'),(19,'users','ticketresponse'),(20,'users','trainer'),(21,'users','training'),(22,'users','trainingschedule'),(24,'users','webauthncredential');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'contenttypes','0001_initial','2025-06-20 12:35:18.328971'),(2,'contenttypes','0002_remove_content_type_name','2025-06-20 12:35:18.464264'),(3,'auth','0001_initial','2025-06-20 12:35:18.886284'),(4,'auth','0002_alter_permission_name_max_length','2025-06-20 12:35:18.973305'),(5,'auth','0003_alter_user_email_max_length','2025-06-20 12:35:18.983528'),(6,'auth','0004_alter_user_username_opts','2025-06-20 12:35:18.993108'),(7,'auth','0005_alter_user_last_login_null','2025-06-20 12:35:19.005890'),(8,'auth','0006_require_contenttypes_0002','2025-06-20 12:35:19.011634'),(9,'auth','0007_alter_validators_add_error_messages','2025-06-20 12:35:19.026907'),(10,'auth','0008_alter_user_username_max_length','2025-06-20 12:35:19.036237'),(11,'auth','0009_alter_user_last_name_max_length','2025-06-20 12:35:19.045447'),(12,'auth','0010_alter_group_name_max_length','2025-06-20 12:35:19.083394'),(13,'auth','0011_update_proxy_permissions','2025-06-20 12:35:19.098310'),(14,'auth','0012_alter_user_first_name_max_length','2025-06-20 12:35:19.108761'),(15,'users','0001_initial','2025-06-20 12:35:22.273621'),(16,'admin','0001_initial','2025-06-20 12:35:22.501051'),(17,'admin','0002_logentry_remove_auto_add','2025-06-20 12:35:22.514805'),(18,'admin','0003_logentry_add_action_flag_choices','2025-06-20 12:35:22.530413'),(19,'authtoken','0001_initial','2025-06-20 12:35:22.652224'),(20,'authtoken','0002_auto_20160226_1747','2025-06-20 12:35:22.705612'),(21,'authtoken','0003_tokenproxy','2025-06-20 12:35:22.711083'),(22,'authtoken','0004_alter_tokenproxy_options','2025-06-20 12:35:22.717971'),(23,'sessions','0001_initial','2025-06-20 12:35:22.766545'),(24,'users','0002_alter_announcement_created_by_and_more','2025-06-20 13:58:08.488013'),(25,'users','0003_remove_announcement_created_by','2025-06-20 14:12:31.576556');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_announcement`
--

DROP TABLE IF EXISTS `users_announcement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_announcement` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `date_created` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_announcement`
--

LOCK TABLES `users_announcement` WRITE;
/*!40000 ALTER TABLE `users_announcement` DISABLE KEYS */;
INSERT INTO `users_announcement` VALUES (2,'Gym Opening Announcement','Hi','2025-06-20 16:10:23.006205');
/*!40000 ALTER TABLE `users_announcement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_attendance`
--

DROP TABLE IF EXISTS `users_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_attendance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `check_in_time` datetime(6) NOT NULL,
  `verification_method` varchar(20) NOT NULL,
  `member_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_attendance_member_id_date_780ba449_uniq` (`member_id`,`date`),
  CONSTRAINT `users_attendance_member_id_aec8dc2e_fk_users_member_user_id` FOREIGN KEY (`member_id`) REFERENCES `users_member` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_attendance`
--

LOCK TABLES `users_attendance` WRITE;
/*!40000 ALTER TABLE `users_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_challenge`
--

DROP TABLE IF EXISTS `users_challenge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_challenge` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `description` longtext NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `created_by_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_challenge_created_by_id_8b33b2af_fk_users_customuser_id` (`created_by_id`),
  CONSTRAINT `users_challenge_created_by_id_8b33b2af_fk_users_customuser_id` FOREIGN KEY (`created_by_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_challenge`
--

LOCK TABLES `users_challenge` WRITE;
/*!40000 ALTER TABLE `users_challenge` DISABLE KEYS */;
INSERT INTO `users_challenge` VALUES (2,'NON STOP running','Join the challenge','2025-06-05','2025-06-30',1);
/*!40000 ALTER TABLE `users_challenge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_challenge_participants`
--

DROP TABLE IF EXISTS `users_challenge_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_challenge_participants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `challenge_id` bigint NOT NULL,
  `customuser_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_challenge_particip_challenge_id_customuser__348f72d3_uniq` (`challenge_id`,`customuser_id`),
  KEY `users_challenge_part_customuser_id_2d1c885a_fk_users_cus` (`customuser_id`),
  CONSTRAINT `users_challenge_part_challenge_id_b0306ae2_fk_users_cha` FOREIGN KEY (`challenge_id`) REFERENCES `users_challenge` (`id`),
  CONSTRAINT `users_challenge_part_customuser_id_2d1c885a_fk_users_cus` FOREIGN KEY (`customuser_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_challenge_participants`
--

LOCK TABLES `users_challenge_participants` WRITE;
/*!40000 ALTER TABLE `users_challenge_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_challenge_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_comment`
--

DROP TABLE IF EXISTS `users_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_comment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `content` longtext NOT NULL,
  `date_created` datetime(6) NOT NULL,
  `author_id` bigint NOT NULL,
  `post_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_comment_author_id_daafd36a_fk_users_customuser_id` (`author_id`),
  KEY `users_comment_post_id_fb15d6ef_fk_users_post_id` (`post_id`),
  CONSTRAINT `users_comment_author_id_daafd36a_fk_users_customuser_id` FOREIGN KEY (`author_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `users_comment_post_id_fb15d6ef_fk_users_post_id` FOREIGN KEY (`post_id`) REFERENCES `users_post` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_comment`
--

LOCK TABLES `users_comment` WRITE;
/*!40000 ALTER TABLE `users_comment` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_customuser`
--

DROP TABLE IF EXISTS `users_customuser`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_customuser` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `role` varchar(10) NOT NULL,
  `email` varchar(254) NOT NULL,
  `username` varchar(150) DEFAULT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_customuser`
--

LOCK TABLES `users_customuser` WRITE;
/*!40000 ALTER TABLE `users_customuser` DISABLE KEYS */;
INSERT INTO `users_customuser` VALUES (1,'pbkdf2_sha256$1000000$hQbHwWOo2IhcGCPx5qnjpS$3S6ll0rsMn55XhaOpzcf+yoWfzLwlbvcI6VjZxMZvtg=',NULL,1,1,1,'2025-06-20 12:36:22.733091','member','admin@gmail.com',NULL,'Osama','Noorani'),(2,'pbkdf2_sha256$1000000$Tj5SRcYDwideQ7IzOv8bhl$RikaDgpW9T6eghtQK5wS2V+ULTiT501Fk07/K2etYBM=',NULL,0,0,1,'2025-06-20 14:28:37.333758','member','osama1@gym.temp','osama1','',''),(3,'pbkdf2_sha256$1000000$7fttrORc6QMb5Q6eRfCXJO$uhIEoihER6CwP2eK8ogK3CZliDjCe5XJ6/bqibIwQZ0=',NULL,0,0,1,'2025-06-20 14:29:34.246633','member','akash2@gym.temp','akash2','',''),(4,'pbkdf2_sha256$1000000$50WQEt1EJm3VzytptQBXoQ$AjMCpHFfcmGGXa2t9NTMhMxYxA7I/bUW+EhHwPaLw60=',NULL,0,0,1,'2025-06-20 14:35:24.913813','member','kamran3@gym.temp','kamran3','','');
/*!40000 ALTER TABLE `users_customuser` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_customuser_groups`
--

DROP TABLE IF EXISTS `users_customuser_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_customuser_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customuser_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_customuser_groups_customuser_id_group_id_76b619e3_uniq` (`customuser_id`,`group_id`),
  KEY `users_customuser_groups_group_id_01390b14_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_customuser_gro_customuser_id_958147bf_fk_users_cus` FOREIGN KEY (`customuser_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `users_customuser_groups_group_id_01390b14_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_customuser_groups`
--

LOCK TABLES `users_customuser_groups` WRITE;
/*!40000 ALTER TABLE `users_customuser_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_customuser_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_customuser_user_permissions`
--

DROP TABLE IF EXISTS `users_customuser_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_customuser_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customuser_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_customuser_user_pe_customuser_id_permission_7a7debf6_uniq` (`customuser_id`,`permission_id`),
  KEY `users_customuser_use_permission_id_baaa2f74_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_customuser_use_customuser_id_5771478b_fk_users_cus` FOREIGN KEY (`customuser_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `users_customuser_use_permission_id_baaa2f74_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_customuser_user_permissions`
--

LOCK TABLES `users_customuser_user_permissions` WRITE;
/*!40000 ALTER TABLE `users_customuser_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_customuser_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_faq`
--

DROP TABLE IF EXISTS `users_faq`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_faq` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `question` varchar(255) NOT NULL,
  `answer` longtext NOT NULL,
  `category_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_faq_category_id_a8628bb6_fk_users_faqcategory_id` (`category_id`),
  CONSTRAINT `users_faq_category_id_a8628bb6_fk_users_faqcategory_id` FOREIGN KEY (`category_id`) REFERENCES `users_faqcategory` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_faq`
--

LOCK TABLES `users_faq` WRITE;
/*!40000 ALTER TABLE `users_faq` DISABLE KEYS */;
INSERT INTO `users_faq` VALUES (1,'How Much is the Fee?','1000 for Fitness & 400 for Gym',1);
/*!40000 ALTER TABLE `users_faq` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_faqcategory`
--

DROP TABLE IF EXISTS `users_faqcategory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_faqcategory` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_faqcategory`
--

LOCK TABLES `users_faqcategory` WRITE;
/*!40000 ALTER TABLE `users_faqcategory` DISABLE KEYS */;
INSERT INTO `users_faqcategory` VALUES (1,'Billing Information');
/*!40000 ALTER TABLE `users_faqcategory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_member`
--

DROP TABLE IF EXISTS `users_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_member` (
  `user_id` bigint NOT NULL,
  `athlete_id` varchar(20) NOT NULL,
  `biometric_data` longtext,
  `biometric_hash` varchar(255) DEFAULT NULL,
  `biometric_registered` tinyint(1) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `monthly_fee` decimal(8,2) NOT NULL,
  `membership_type` varchar(10) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `start_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `box_number` varchar(20) DEFAULT NULL,
  `time_slot` varchar(10) NOT NULL,
  `notified_expired` tinyint(1) NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `athlete_id` (`athlete_id`),
  CONSTRAINT `users_member_user_id_b4cd9a3f_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_member`
--

LOCK TABLES `users_member` WRITE;
/*!40000 ALTER TABLE `users_member` DISABLE KEYS */;
INSERT INTO `users_member` VALUES (2,'1',NULL,NULL,0,'Osama','Noorani',1000.00,'gym','0794151593','2025-05-25','2025-07-20','2','evening',0),(3,'2',NULL,NULL,0,'Akash','Noorani',400.00,'gym','0786129331','2025-04-25','2025-05-25','2','evening',1),(4,'3',NULL,NULL,0,'Kamran','Akmal',400.00,'fitness','0784544334','2025-06-20','2025-07-20','3','afternoon',0);
/*!40000 ALTER TABLE `users_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_notification`
--

DROP TABLE IF EXISTS `users_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_notification` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `is_read` tinyint(1) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `users_notification_user_id_fed360c8_fk_users_customuser_id` (`user_id`),
  CONSTRAINT `users_notification_user_id_fed360c8_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_notification`
--

LOCK TABLES `users_notification` WRITE;
/*!40000 ALTER TABLE `users_notification` DISABLE KEYS */;
INSERT INTO `users_notification` VALUES (1,'New admin challenge created: NON STOP 20 Minutes Running','2025-06-20 13:16:30.011294',0,NULL),(2,'Admin deleted challenge ID: 1','2025-06-20 14:22:47.128769',0,NULL),(3,'Membership expired for: Akash Noorani','2025-06-20 14:29:36.719606',0,NULL),(4,'Membership renewed for: Osama Noorani','2025-06-20 14:29:40.879693',0,NULL),(5,'Product added successfully: Whey Protein','2025-06-20 14:34:43.119863',0,NULL),(6,'New admin challenge created: NON STOP running','2025-06-20 16:10:08.126971',0,NULL),(7,'Osama Noorani needs support. Click here to view his/her message.','2025-06-20 16:44:15.476459',0,NULL),(8,'Admin responded to support ticket ID: 1','2025-06-20 16:47:00.416545',0,NULL),(9,'Admin closed support ticket ID: 1','2025-06-20 16:49:01.819062',0,NULL);
/*!40000 ALTER TABLE `users_notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_post`
--

DROP TABLE IF EXISTS `users_post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_post` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `content` longtext NOT NULL,
  `date_created` datetime(6) NOT NULL,
  `likes` int NOT NULL,
  `author_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_post_author_id_5106b896_fk_users_customuser_id` (`author_id`),
  CONSTRAINT `users_post_author_id_5106b896_fk_users_customuser_id` FOREIGN KEY (`author_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_post`
--

LOCK TABLES `users_post` WRITE;
/*!40000 ALTER TABLE `users_post` DISABLE KEYS */;
INSERT INTO `users_post` VALUES (1,'My Fitness Journey','I really enjoy my Fitness journey, What about you guys?','2025-06-20 17:37:59.108372',1,2);
/*!40000 ALTER TABLE `users_post` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_product`
--

DROP TABLE IF EXISTS `users_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_product` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image` varchar(100) DEFAULT NULL,
  `description` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_product`
--

LOCK TABLES `users_product` WRITE;
/*!40000 ALTER TABLE `users_product` DISABLE KEYS */;
INSERT INTO `users_product` VALUES (1,'Whey Protein',4000.00,'product_images/whey_QrHLui3.jpg',NULL,'2025-06-20 14:34:43.114396','2025-06-20 14:34:43.114425');
/*!40000 ALTER TABLE `users_product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_purchase`
--

DROP TABLE IF EXISTS `users_purchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_purchase` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `quantity` int unsigned NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `date` datetime(6) NOT NULL,
  `product_id` int NOT NULL,
  `member_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `users_purchase_product_id_7435a5be_fk_users_product_product_id` (`product_id`),
  KEY `users_purchase_member_id_e88ebbbb_fk_users_member_user_id` (`member_id`),
  CONSTRAINT `users_purchase_member_id_e88ebbbb_fk_users_member_user_id` FOREIGN KEY (`member_id`) REFERENCES `users_member` (`user_id`),
  CONSTRAINT `users_purchase_product_id_7435a5be_fk_users_product_product_id` FOREIGN KEY (`product_id`) REFERENCES `users_product` (`product_id`),
  CONSTRAINT `users_purchase_chk_1` CHECK ((`quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_purchase`
--

LOCK TABLES `users_purchase` WRITE;
/*!40000 ALTER TABLE `users_purchase` DISABLE KEYS */;
INSERT INTO `users_purchase` VALUES (1,1,4000.00,'2025-06-20 14:34:54.962506',1,NULL);
/*!40000 ALTER TABLE `users_purchase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_supportticket`
--

DROP TABLE IF EXISTS `users_supportticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_supportticket` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `type` varchar(20) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `message` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `date_created` datetime(6) NOT NULL,
  `member_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_supportticket_member_id_171adf75_fk_users_member_user_id` (`member_id`),
  CONSTRAINT `users_supportticket_member_id_171adf75_fk_users_member_user_id` FOREIGN KEY (`member_id`) REFERENCES `users_member` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_supportticket`
--

LOCK TABLES `users_supportticket` WRITE;
/*!40000 ALTER TABLE `users_supportticket` DISABLE KEYS */;
INSERT INTO `users_supportticket` VALUES (1,'billing','Monthly Fee','How much is the monthly fee?','closed','2025-06-20 16:44:15.468669',2);
/*!40000 ALTER TABLE `users_supportticket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_ticketresponse`
--

DROP TABLE IF EXISTS `users_ticketresponse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_ticketresponse` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message` longtext NOT NULL,
  `date_created` datetime(6) NOT NULL,
  `responder_id` bigint NOT NULL,
  `ticket_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_ticketresponse_responder_id_6464d945_fk_users_cus` (`responder_id`),
  KEY `users_ticketresponse_ticket_id_2b7eae93_fk_users_sup` (`ticket_id`),
  CONSTRAINT `users_ticketresponse_responder_id_6464d945_fk_users_cus` FOREIGN KEY (`responder_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `users_ticketresponse_ticket_id_2b7eae93_fk_users_sup` FOREIGN KEY (`ticket_id`) REFERENCES `users_supportticket` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_ticketresponse`
--

LOCK TABLES `users_ticketresponse` WRITE;
/*!40000 ALTER TABLE `users_ticketresponse` DISABLE KEYS */;
INSERT INTO `users_ticketresponse` VALUES (1,'1000 for Fitness and 400 for Gym','2025-06-20 16:47:00.410379',1,1);
/*!40000 ALTER TABLE `users_ticketresponse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_trainer`
--

DROP TABLE IF EXISTS `users_trainer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_trainer` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `trainer_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(254) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `monthly_salary` decimal(10,2) NOT NULL,
  `specialization` varchar(20) NOT NULL,
  `start_date` date NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trainer_id` (`trainer_id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `users_trainer_user_id_5fe96b93_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_trainer`
--

LOCK TABLES `users_trainer` WRITE;
/*!40000 ALTER TABLE `users_trainer` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_trainer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_training`
--

DROP TABLE IF EXISTS `users_training`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_training` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `type` varchar(20) NOT NULL,
  `datetime` datetime(6) NOT NULL,
  `duration` int NOT NULL,
  `capacity` int NOT NULL,
  `description` longtext,
  `trainer_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_training_trainer_id_631e1dd6_fk_users_trainer_id` (`trainer_id`),
  CONSTRAINT `users_training_trainer_id_631e1dd6_fk_users_trainer_id` FOREIGN KEY (`trainer_id`) REFERENCES `users_trainer` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_training`
--

LOCK TABLES `users_training` WRITE;
/*!40000 ALTER TABLE `users_training` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_training` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_trainingschedule`
--

DROP TABLE IF EXISTS `users_trainingschedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_trainingschedule` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `monday` longtext NOT NULL,
  `tuesday` longtext NOT NULL,
  `wednesday` longtext NOT NULL,
  `thursday` longtext NOT NULL,
  `friday` longtext NOT NULL,
  `saturday` longtext NOT NULL,
  `sunday` longtext NOT NULL,
  `member_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_id` (`member_id`),
  CONSTRAINT `users_trainingschedu_member_id_9f2d9d42_fk_users_mem` FOREIGN KEY (`member_id`) REFERENCES `users_member` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_trainingschedule`
--

LOCK TABLES `users_trainingschedule` WRITE;
/*!40000 ALTER TABLE `users_trainingschedule` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_trainingschedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_webauthncredential`
--

DROP TABLE IF EXISTS `users_webauthncredential`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_webauthncredential` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `credential_id` varchar(255) NOT NULL,
  `public_key` longtext NOT NULL,
  `sign_count` int unsigned NOT NULL,
  `rp_id` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `member_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_webauthncredential_member_id_credential_id_74136da6_uniq` (`member_id`,`credential_id`),
  CONSTRAINT `users_webauthncreden_member_id_57f1f7e0_fk_users_mem` FOREIGN KEY (`member_id`) REFERENCES `users_member` (`user_id`),
  CONSTRAINT `users_webauthncredential_chk_1` CHECK ((`sign_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_webauthncredential`
--

LOCK TABLES `users_webauthncredential` WRITE;
/*!40000 ALTER TABLE `users_webauthncredential` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_webauthncredential` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-21 20:29:01
