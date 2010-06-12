#ifndef CEPH_COMMON_INIT_H
#define CEPH_COMMON_INIT_H

#include <vector>

void common_init(std::vector<const char*>& args,
		 const char *module_type,
		 bool daemon,
                 bool init_keys);

#endif
