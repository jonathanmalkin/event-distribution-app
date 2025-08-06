# WordPress Staging Environment Setup - DigitalOcean

## 🎯 **Staging Requirements**

- **Easy deployment**: Push staging → production when ready
- **Easy sync**: Copy production → staging for testing
- **Cost-effective**: Minimal additional infrastructure costs
- **WordPress-optimized**: Event Distribution App testing environment

## 🏗️ **Option 1: OrangeWebsite WordPress Hosting (Updated Recommendation)**

### **Why OrangeWebsite?**
- **Managed WordPress hosting**: 3x faster than shared hosting
- **Full management**: They handle server administration, security, backups
- **Iceland-based**: Privacy-focused with low censorship, 100% renewable energy
- **24/7 expert support**: Response time within minutes
- **DDoS protection**: Advanced security built-in
- **JetBackup included**: Automated backup system

### **WordPress Hosting Plans**
1. **WordPress Emerald**: €32.90/month (~$35/month)
   - 30GB storage, 500GB monthly traffic
   - cPanel control panel with 330+ one-click installers
   
2. **WordPress Ruby** (Most Popular): €41.90/month (~$45/month)
   - 40GB storage, 1TB monthly traffic, 1 addon domain
   - Includes all Emerald features plus more resources
   
3. **WordPress Sapphire**: €55.90/month (~$60/month)
   - 50GB storage, 2TB monthly traffic, 2 addon domains

### **Staging Environment Setup**
Since OrangeWebsite uses cPanel, you can create staging environments using:

#### **Method 1: Manual cPanel Staging**
```bash
# Create staging subdomain in cPanel
1. cPanel → Subdomains → Create "staging.kinky.coffee"
2. File Manager → Copy WordPress files to staging folder
3. phpMyAdmin → Export production DB, import to staging DB
4. Update wp-config.php with staging database credentials
```

#### **Method 2: Plugin-Based Staging**
```
1. Install WP Staging Pro on production site
2. Create staging environment via WordPress admin
3. Access via staging.kinky.coffee subdomain
4. Push/pull changes through plugin interface
```

### **Cost Comparison vs Cloudways**
- **OrangeWebsite Ruby**: €41.90/month (~$45/month)
- **Cloudways**: Now $14-30/month (corrected pricing)
- **Value**: OrangeWebsite handles more infrastructure management

### **Workflow**
```
1. Test changes on staging-kinky.coffee
2. Event Distribution App → staging for testing
3. One-click push staging → production when ready
4. One-click production → staging for fresh testing environment
```

## 🏗️ **Option 2: DigitalOcean App Platform**

### **Dual Environment Setup**
- **Production**: `kinky-coffee-prod` 
- **Staging**: `kinky-coffee-staging`
- **Database**: Shared managed MySQL cluster
- **Sync**: Custom scripts + database cloning

### **Setup Process**
1. **Create Apps**:
   ```bash
   # Production App
   doctl apps create --spec production-app.yaml
   
   # Staging App  
   doctl apps create --spec staging-app.yaml
   ```

2. **Database Setup**:
   ```bash
   # Managed MySQL cluster for both environments
   doctl databases create kinky-coffee-db --engine mysql --size db-s-1vcpu-1gb
   ```

3. **Sync Scripts**:
   ```bash
   # Production → Staging sync script
   #!/bin/bash
   mysqldump production_db | mysql staging_db
   rsync -av production_files/ staging_files/
   ```

### **Cost**
- **Production App**: $12/month (1GB RAM)
- **Staging App**: $5/month (512MB RAM)  
- **Database**: $15/month (managed MySQL)
- **Total**: $32/month

### **Pros & Cons**
✅ **Pros**: Full control, managed database, scalable
❌ **Cons**: More complex, higher cost, manual sync scripts

## 🏗️ **Option 3: Single Droplet with Subdomain**

### **Cost-Effective Solution**
- **Single Droplet**: $12/month (2GB RAM)
- **Nginx Configuration**: Multiple domains on one server
- **Database**: Separate databases for prod/staging
- **Sync**: WP-CLI scripts for easy sync

### **Setup Process**
1. **Droplet Configuration**:
   ```bash
   # Install LEMP stack
   sudo apt update && sudo apt install nginx mysql-server php-fpm php-mysql
   
   # Create separate directories
   /var/www/kinky.coffee/          # Production
   /var/www/staging.kinky.coffee/  # Staging
   ```

2. **Nginx Configuration**:
   ```nginx
   # /etc/nginx/sites-available/kinky.coffee
   server {
       server_name kinky.coffee www.kinky.coffee;
       root /var/www/kinky.coffee;
       # Production config
   }
   
   # /etc/nginx/sites-available/staging.kinky.coffee  
   server {
       server_name staging.kinky.coffee;
       root /var/www/staging.kinky.coffee;
       # Staging config
   }
   ```

3. **Database Setup**:
   ```sql
   CREATE DATABASE kinky_coffee_prod;
   CREATE DATABASE kinky_coffee_staging;
   CREATE USER 'wp_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL ON kinky_coffee_prod.* TO 'wp_user'@'localhost';
   GRANT ALL ON kinky_coffee_staging.* TO 'wp_user'@'localhost';
   ```

4. **Sync Scripts**:
   ```bash
   #!/bin/bash
   # sync-prod-to-staging.sh
   
   # Database sync
   mysqldump kinky_coffee_prod | mysql kinky_coffee_staging
   
   # Files sync (exclude uploads if needed)
   rsync -av --exclude='wp-config.php' \
         /var/www/kinky.coffee/ \
         /var/www/staging.kinky.coffee/
   
   # Update URLs in staging database
   wp search-replace 'kinky.coffee' 'staging.kinky.coffee' \
      --path='/var/www/staging.kinky.coffee' \
      --allow-root
   ```

### **Cost**
- **Droplet**: $12/month (2GB RAM, 50GB SSD)
- **SSL**: Free (Let's Encrypt)
- **Total**: $12/month

### **Management Scripts**
```bash
# Deploy staging to production
./deploy-staging-to-prod.sh

# Copy production to staging  
./sync-prod-to-staging.sh

# Backup before deployment
./backup-production.sh
```

## 🏗️ **Option 4: Plugin-Based Staging**

### **WP Staging Pro Solution**
- **Plugin**: WP Staging Pro ($99/year)
- **Server**: Keep existing DigitalOcean setup
- **Staging**: Database-level staging within WordPress

### **Features**
- **One-click staging**: Create staging within WordPress admin
- **Push/Pull**: Deploy changes via admin interface  
- **Selective sync**: Choose what to sync (database, files, etc.)
- **Multiple staging sites**: Test different scenarios

### **Setup Process**
1. **Install WP Staging Pro** on existing production site
2. **Create staging**: One-click from admin dashboard
3. **Configure subdomains**: Point staging.kinky.coffee to staging folder
4. **Test & Deploy**: Use admin interface for sync operations

### **Cost**
- **Plugin**: $99/year
- **Server**: $0 additional (uses existing)
- **Total**: $99/year

## 🏆 **Updated Recommendation: OrangeWebsite vs Cloudways**

### **OrangeWebsite WordPress Ruby - Best for Full Management**

✅ **Fully Managed**: They handle all server administration tasks
✅ **Privacy-Focused**: Iceland-based with strong data protection laws
✅ **Expert Support**: WordPress specialists available 24/7 within minutes
✅ **Security Included**: Advanced DDoS protection and hardened servers
✅ **Renewable Energy**: 100% green hosting infrastructure
✅ **Enterprise Features**: JetBackup, SpamExperts, advanced monitoring

**Cost**: €41.90/month (~$45/month) - Premium for full management

### **Cloudways - Best for Cost/Control Balance**

✅ **Cost-Effective**: $14-30/month depending on server size
✅ **Built-in Staging**: One-click staging environments
✅ **DigitalOcean**: Uses your preferred infrastructure
✅ **Performance**: WordPress-optimized stack
✅ **Control**: More technical control over server settings

**Cost**: $14-30/month - Lower cost but requires more hands-on management

### **Setup Steps for Cloudways**

1. **Sign Up**: Create Cloudways account, connect DigitalOcean
2. **Launch Server**: 
   - Provider: DigitalOcean
   - Size: $12/month (1GB)
   - Location: Same as current production
3. **Migrate Site**: 
   - Use Cloudways migrator plugin
   - Or manual: export/import database + files
4. **Create Staging**: Click "Create Staging" in dashboard
5. **Configure DNS**:
   ```
   Production: kinky.coffee → server IP
   Staging: staging.kinky.coffee → same server IP (Cloudways handles routing)
   ```

### **Daily Workflow**
```
Development → Event Distribution App → staging.kinky.coffee (test)
                                    ↓
                              One-click push to kinky.coffee (production)
```

## 🔧 **Event Distribution App Configuration**

### **Environment Variables for Testing**
```bash
# Production
WORDPRESS_SITE_URL=https://kinky.coffee
WORDPRESS_USERNAME=production_user
WORDPRESS_PASSWORD=production_password

# Staging  
WORDPRESS_SITE_URL_STAGING=https://staging.kinky.coffee
WORDPRESS_USERNAME_STAGING=staging_user
WORDPRESS_PASSWORD_STAGING=staging_password
```

### **Testing Strategy**
1. **Development Testing**: Local → staging.kinky.coffee
2. **Integration Testing**: Event Distribution App → staging
3. **Production Deploy**: Push staging → production when ready
4. **Rollback Strategy**: Cloudways keeps automatic backups

## 💰 **Updated Cost Comparison**

| Solution | Monthly Cost | Annual Cost | Staging Method | Management Level |
|----------|-------------|-------------|----------------|------------------|
| **OrangeWebsite Ruby** | $45 | $540 | cPanel + Plugin | Fully Managed |
| **Cloudways** | $14-30 | $168-360 | Built-in One-click | Semi-Managed |
| **App Platform** | $32 | $384 | Custom Scripts | Self-Managed |
| **Single Droplet** | $12 | $144 | Manual Setup | Self-Managed |
| **WP Staging Pro** | $8+ | $99+ | Plugin-Based | Plugin-Dependent |

### **Value Assessment**
- **OrangeWebsite**: Premium cost but includes expert WordPress management, security, backups
- **Cloudways**: Good balance of features vs cost, but requires more technical involvement
- **Self-Managed**: Cheapest but requires significant time investment

### **For Your Use Case**
Given your preference for "they handle most things" at the ~$30-45 price point, **OrangeWebsite WordPress Ruby** aligns perfectly with your requirements.

## 🚀 **Updated Next Steps**

### **Recommended Path: OrangeWebsite WordPress Ruby**

1. **Sign up for OrangeWebsite WordPress Ruby** (~$45/month)
   - Contact their support about Event Distribution App requirements
   - Confirm staging environment setup process
   - Migrate existing kinky.coffee site

2. **Set up staging environment**:
   ```bash
   # Via cPanel
   1. Create staging.kinky.coffee subdomain
   2. Install WP Staging Pro plugin
   3. Configure automated push/pull workflow
   ```

3. **Install required plugins**:
   - The Events Calendar (free)
   - Event Tickets (free) 
   - JWT Authentication for WP REST API
   - WP Staging Pro ($99/year) for easy deployment

4. **Configure Event Distribution App** for staging testing
5. **Test complete workflow** before production deployment

### **Alternative: Cloudways (Budget-Conscious)**
If the $45/month OrangeWebsite cost is too high, Cloudways at $14-30/month still provides good staging capabilities but requires more hands-on management.

### **Testing Checklist**
- [ ] WordPress API connection
- [ ] Event creation via Event Distribution App  
- [ ] Image optimization and upload
- [ ] The Events Calendar integration
- [ ] Event Tickets RSVP functionality
- [ ] Cross-platform RSVP links
- [ ] Staging → production deployment process

**OrangeWebsite WordPress Ruby offers the best "they handle most things" experience at your preferred price point!**